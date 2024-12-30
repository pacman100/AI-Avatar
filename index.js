import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import fetchAndCombineFiles from './context.js';

let CONTEXT_STRING = await fetchAndCombineFiles();

/*************** WebLLM logic ***************/
const messages = [
    {
        content: "You are Sourab Mangrulkar. Use the following context to answer questions in a professional tone and be terse. Do not use any outside information or sources.\n\nContext:" + CONTEXT_STRING,
        role: "system",
    },
];

// Callback function for initializing progress
function updateEngineInitProgressCallback(report) {
    console.log("initialize", report.progress);
    document.getElementById("download-status").textContent = report.text;
}

// Create engine instance
const engine = new webllm.MLCEngine();
engine.setInitProgressCallback(updateEngineInitProgressCallback);

async function initializeWebLLMEngine() {
    document.getElementById("download-status").classList.remove("hidden");
    let selectedModel = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
    const config = {
        temperature: 0.2,
        top_p: 0.9,
    };
    await engine.reload(selectedModel, config);
}

async function streamingGenerating(messages, onUpdate, onFinish, onError) {
    try {
        let curMessage = "";
        let usage;
        const completion = await engine.chat.completions.create({
            stream: true,
            messages,
            stream_options: { include_usage: true },
        });
        for await (const chunk of completion) {
            const curDelta = chunk.choices[0]?.delta.content;
            if (curDelta) {
                curMessage += curDelta;
            }
            if (chunk.usage) {
                usage = chunk.usage;
            }
            onUpdate(curMessage);
        }
        const finalMessage = await engine.getMessage();
        onFinish(finalMessage, usage);
    } catch (err) {
        onError(err);
    }
}

/*************** UI logic ***************/
function onMessageSend() {
    const input = document.getElementById("user-input").value.trim();
    const message = {
        content: input,
        role: "user",
    };
    if (input.length === 0) {
        return;
    }
    document.getElementById("send").disabled = true;

    messages.push(message);
    appendMessage(message);

    document.getElementById("user-input").value = "";
    document
        .getElementById("user-input")
        .setAttribute("placeholder", "Generating...");

    const aiMessage = {
        content: "typing...",
        role: "assistant",
    };
    appendMessage(aiMessage);

    const onFinishGenerating = (finalMessage, usage) => {
        const aiMessage = {
            content: finalMessage,
            role: "assistant",
        };
        messages.push(aiMessage)
        updateLastMessage(finalMessage);
        document.getElementById("send").disabled = false;
        const usageText =
            `prompt_tokens: ${usage.prompt_tokens}, ` +
            `completion_tokens: ${usage.completion_tokens}, ` +
            `prefill: ${usage.extra.prefill_tokens_per_s.toFixed(4)} tokens/sec, ` +
            `decoding: ${usage.extra.decode_tokens_per_s.toFixed(4)} tokens/sec`;
        document.getElementById("chat-stats").classList.remove("hidden");
        document.getElementById("chat-stats").textContent = usageText;
    };

    streamingGenerating(
        messages,
        updateLastMessage,
        onFinishGenerating,
        console.error,
    );
}

function appendMessage(message) {
    const chatBox = document.getElementById("chat-box");
    const container = document.createElement("div");
    container.classList.add("message-container");
    const newMessage = document.createElement("div");
    newMessage.classList.add("message");
    newMessage.textContent = message.content;

    if (message.role === "user") {
        container.classList.add("user");
    } else {
        container.classList.add("assistant");
    }

    container.appendChild(newMessage);
    chatBox.appendChild(container);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the latest message
}

function updateLastMessage(content) {
    const messageDoms = document
        .getElementById("chat-box")
        .querySelectorAll(".message");
    const lastMessageDom = messageDoms[messageDoms.length - 1];
    lastMessageDom.textContent = content;
}

/*************** UI binding ***************/
document.getElementById("download").addEventListener("click", function () {
    initializeWebLLMEngine().then(() => {
        document.getElementById("send").disabled = false;
    });
});
document.getElementById("send").addEventListener("click", function () {
    onMessageSend();
});