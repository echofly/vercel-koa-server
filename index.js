require('dotenv').config();
const Koa = require('koa');
const Router = require('@koa/router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const { Configuration, OpenAIApi } = require('openai');
const { PassThrough } = require('stream');

const app = new Koa();
const router = new Router();
const port = process.env.PORT || 4000;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

router.get('/hello', async ctx => {
  const { what } = ctx.query;

  ctx.body = {
    message: `Hello ${what || 'World'}`
  };
  ctx.status = 200;
});

router.post('/message', async ctx => {
  console.log(ctx.request.body)
  const { messages } = ctx.request.body;
  const openai = new OpenAIApi(configuration);
  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: messages,
    max_tokens: 6000,
    temperature: 0.9,
    // 是否以流的方式输出给客户端
    // stream: true,
  });

  ctx.body = {
    message: response.data
  };
  ctx.status = 200;
});

// 客户端使用@microsoft/fetch-event-source来请求及接收数据
router.post('/chat', ctx => {
  const { messages } = ctx.request.body
  ctx.set({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  const sseStream = new PassThrough()
  ctx.body = sseStream
  console.log(messages)

  const content = messages?.[0]?.content || '你未输入内容'

  let step = 0;
  // 定时器依次返回message
  const time = setInterval(() => {
    const data = { message: content[step++] };
    // 每个消息以 \n\n分割
    sseStream.write(`data: ${JSON.stringify(data)}\n\n`);
    if (step > content.length - 1) {
      sseStream.end()
      clearInterval(time)
    }
  }, 500);
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});