import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import fetchAndCombineFiles from './context.js';
marked.setOptions({ breaks: true, gfm: true });
let CONTEXT_STRING = await fetchAndCombineFiles();
console.log(CONTEXT_STRING);

/*************** WebLLM logic ***************/
const messages = [
    {
        content: "Context:" + CONTEXT_STRING + "\n\n\n# Instructions\n\nYou are an AI-Avatar of Sourab Mangrulkar who solely answers questions about Sourab Mangrulkar. Use the following context to answer questions in a professional tone and keep responses of moderate length. If you encounter any inappropriate or off-topic questions, politely redirect the user back to the main topics related to Sourab Mangrulkar.\nDo not add new details or hallucinate and be grounded in the provided context.",
        role: "system",
    }
];
const GREETING_MESSAGE = "I'm **Sourab Mangrulkar**.\nNice to meet you. I'm here to help you with your questions.";

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
        temperature: 0.01,
        top_p: 0.9,
        repetition_penalty: 1.5
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
function formatMarkdown(content) {
    const normalizedText = content.replace(/\\n/g, '\n');
    const rawHtml = marked.parse(normalizedText);
    return DOMPurify.sanitize(rawHtml);
}

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
    newMessage.innerHTML = formatMarkdown(message.content);

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
    lastMessageDom.innerHTML = formatMarkdown(content);
}

function initializeAndAppendMessage(content, role) {
    document.getElementById('send').disabled = false;
    const message = {
        content: content,
        role: role,
    };
    messages.push(message);
    appendMessage(message);
}

/*************** UI binding ***************/
document.getElementById("download").addEventListener("click", function () {
    initializeWebLLMEngine().then(() => {
        document.getElementById("send").disabled = false;
        initializeAndAppendMessage(GREETING_MESSAGE, "assistant");

        // Fetch the faq.txt file and process its contents
        fetch('files/faq.md')
            .then(response => response.text())
            .then(data => {
                const lines = data.split('\n');
                const questionContainer = document.getElementById('example-questions');
                questionContainer.innerHTML = ''; // Clear any existing content

                // Create a dropdown select element
                const select = document.createElement('select');
                select.className = 'faq-dropdown';

                // Default option
                const defaultOption = document.createElement('option');
                defaultOption.textContent = 'Select a frequently asked question (FAQs).';
                defaultOption.disabled = true;
                defaultOption.selected = true;
                select.appendChild(defaultOption);

                lines.forEach(line => {
                    if (line.trim() !== '') { // Ensure it's not an empty line
                        const option = document.createElement('option');
                        option.value = line; // Store the question
                        option.textContent = line; // Display text
                        select.appendChild(option);
                    }
                });

                // Attach event listener to send the question to the chatbot
                select.addEventListener('change', function () {
                    const selectedQuestion = select.value;

                    // Simulate sending question to chatbot
                    const chatBox = document.getElementById('chat-box');
                    chatBox.innerHTML = ''; // Clear previous messages
                    while (messages.length > 1) {
                        messages.pop();
                    }
                    initializeAndAppendMessage(GREETING_MESSAGE, "assistant");
                    document.getElementById('user-input').value = selectedQuestion; // Set the question as input
                    onMessageSend(); // Trigger chatbot response

                    // Reset the dropdown after selection
                    setTimeout(() => {
                        select.selectedIndex = 0; // Reset to default option
                    }, 500); // Slight delay for smooth interaction
                });

                // Append dropdown to the container
                questionContainer.appendChild(select);
            })
            .catch(error => {
                console.error('Error fetching the faq.txt file:', error);
            });
    });
});

document.getElementById('clear-conversation').addEventListener('click', function () {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; // Clear all messages in the chat box
    document.getElementById('user-input').value = ''; // Clear user input field
    // only keep the first 2 messages
    while (messages.length > 1) {
        messages.pop();
    }
    initializeAndAppendMessage(GREETING_MESSAGE, "assistant");

    // Reset the FAQ dropdown menu
    const faqDropdown = document.querySelector('.faq-dropdown');
    if (faqDropdown) {
        faqDropdown.selectedIndex = 0; // Reset to the default "Select a question" option
    }
});
document.getElementById("send").addEventListener("click", function () {
    onMessageSend();
});
// Function to handle sending message when Enter is pressed
function handleSendOnEnter(event) {
    if (event.key === 'Enter' && event.target.value.trim() !== '') {
        document.getElementById('send').click();
    }
}
document.getElementById('user-input').addEventListener('keypress', handleSendOnEnter);