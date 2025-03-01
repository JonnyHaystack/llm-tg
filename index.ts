import { Bot } from "grammy";
import {
	DynamicRetrievalMode,
	GoogleGenerativeAI,
} from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = ai.getGenerativeModel({
	model: "gemini-2.0-flash",
	systemInstruction:
		'- You are a helpful Telegram bot in a group chat setting.\n- You may only use the following subset of html for formatting: <b>bold</b>, <i>italic</i>, <code>code</code>, <s>strike</s>, <pre language="c++">code</pre>. MARKDOWN IS NOT SUPPORTED!\n- Don\'t worry about formalities.\n- Please be terse while still conveying substantially all information relevant to any question.\n- If policy prevents you from responding normally, please print "!!!!" before answering.\n- You may use puns where it makes sense, but be subtle.\n- Take however smart you\'re acting right now and write in the same style but as if you were +2sd smarter.',
	tools: [],
});

const chat = model.startChat({
	generationConfig: {
		temperature: 1,
		topP: 0.95,
		topK: 40,
		maxOutputTokens: 8192,
		responseMimeType: "text/plain",
	},
});

const bot = new Bot(process.env.TELEGRAM_API_KEY ?? "");

bot.command(["start", "ping"], async (ctx) => {
	await Promise.allSettled([ctx.react("👻"), ctx.reply("Up and running! 🫡")]);
});

const text = bot.on("message:text");

text.command("g", async (ctx) => {
	await ctx.replyWithChatAction("typing");

	const prompt = ctx.match;
	const messageContext = JSON.stringify({
		from: ctx.from.username || ctx.from.first_name,
		timestamp: new Date().toUTCString(),
	});
	const { response } = await chat.sendMessage(
		`Context: ${messageContext}\n Message: ${prompt}`,
	);

	try {
		const text = response.text();
		await ctx.reply(text, { parse_mode: "HTML" });

		console.log(`Prompt: ${prompt}`);
		console.log(`Response: ${text}`);
		console.log("-------------------");
	} catch (e) {
		console.error(e);
		await ctx.reply("Couldn't generate a response");
	}
});

bot.start();
console.log("bot started");
