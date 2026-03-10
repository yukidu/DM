// 定義五種具有強烈設計感的藝術風格
const styles = [
    {
        name: "瑞士平面主義 (Swiss Design)",
        bgColor: "#E63946",
        secondaryColor: "#F1FAEE",
        accentColor: "#1D3557",
        fontColor: "#FFFFFF",
        layout: "grid", // 強調網格與大標題
        drawExtra: (ctx, w, h) => {
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.lineWidth = 2;
            for(let i=0; i<w; i+=w/10) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
        }
    },
    {
        name: "日系極簡禪意 (Japanese Zen)",
        bgColor: "#F2E9E4",
        secondaryColor: "#C9ADA7",
        accentColor: "#4A4E69",
        fontColor: "#222222",
        layout: "vertical", // 繁體中文縱排美感
        drawExtra: (ctx, w, h) => {
            ctx.fillStyle = "#4A4E69";
            ctx.beginPath(); ctx.arc(w*0.8, h*0.2, w*0.1, 0, Math.PI*2); ctx.fill(); // 紅日意象
        }
    },
    {
        name: "包浩斯幾何 (Bauhaus)",
        bgColor: "#222222",
        secondaryColor: "#FFD60A",
        accentColor: "#003566",
        fontColor: "#FFD60A",
        layout: "geometric",
        drawExtra: (ctx, w, h) => {
            ctx.fillStyle = "#FFC300"; ctx.fillRect(0, h*0.7, w, h*0.3);
            ctx.fillStyle = "#003566"; ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, h*0.5); ctx.lineTo(w*0.5, 0); ctx.fill();
        }
    },
    {
        name: "霓虹賽博 (Cyberpunk)",
        bgColor: "#0F0A1F",
        secondaryColor: "#FF007F",
        accentColor: "#00F5FF",
        fontColor: "#00F5FF",
        layout: "edge",
        drawExtra: (ctx, w, h) => {
            ctx.shadowBlur = 20; ctx.shadowColor = "#FF007F";
            ctx.strokeStyle = "#FF007F"; ctx.strokeRect(30, 30, w-60, h-60);
            ctx.shadowBlur = 0;
        }
    },
    {
        name: "莫蘭迪優雅 (Morandi)",
        bgColor: "#9A8C98",
        secondaryColor: "#F2E9E4",
        accentColor: "#4A4E69",
        fontColor: "#222222",
        layout: "center-soft",
        drawExtra: (ctx, w, h) => {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "#C9ADA7"; ctx.fillRect(w*0.1, h*0.1, w*0.8, h*0.8);
            ctx.globalAlpha = 1.0;
        }
    }
];

let currentStyle = styles[0];
let processedImage = null;

// --- 背景去背邏輯 (維持不變) ---
document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('status');
    status.innerText = "✨ AI 正在精細去背中...";
    try {
        const blob = await imglyRemoveBackground(file);
        processedImage = await createImageBitmap(blob);
        status.innerText = "✅ 照片處理完成";
    } catch (e) {
        status.innerText = "❌ 去背失敗，改用原圖";
        const reader = new FileReader();
        reader.onload = (re) => { const img = new Image(); img.onload = () => { processedImage = img; }; img.src = re.target.result; };
        reader.readAsDataURL(file);
    }
});

// --- 隨機風格切換 ---
document.getElementById('randomStyleBtn').addEventListener('click', () => {
    currentStyle = styles[Math.floor(Math.random() * styles.length)];
    document.getElementById('status').innerText = `🎨 當前風格：${currentStyle.name}`;
});

// --- 生成核心邏輯 ---
document.getElementById('generateBtn').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;
    if (!apiKey) return alert("請先輸入 Gemini API Key");

    const status = document.getElementById('status');
    status.innerText = "🚀 AI 設計師正在構思排版...";

    const userData = {
        name: document.getElementById('name').value || "受邀嘉賓",
        title: document.getElementById('eventTitle').value || "未命名精彩活動",
        date: document.getElementById('date').value || "2025.01.01",
        time: document.getElementById('time').value || "14:00"
    };

    // 模擬 AI 思考時間並繪圖
    setTimeout(() => {
        draw(document.getElementById('portraitCanvas'), userData, 'portrait');
        draw(document.getElementById('landscapeCanvas'), userData, 'landscape');
        status.innerText = "✨ 海報生成完畢！";
    }, 1000);
});

function draw(canvas, data, type) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 1. 底色與藝術背景
    ctx.fillStyle = currentStyle.bgColor;
    ctx.fillRect(0, 0, w, h);
    currentStyle.drawExtra(ctx, w, h);

    // 2. 繪製人物 (圖層處理)
    if (processedImage) {
        const ratio = (type === 'portrait') ? (w * 0.9) / processedImage.width : (h * 0.9) / processedImage.height;
        const dw = processedImage.width * ratio;
        const dh = processedImage.height * ratio;
        const dx = (type === 'portrait') ? (w - dw) / 2 : w * 0.5;
        const dy = h - dh;

        // 加一點人物陰影感
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 30;
        ctx.drawImage(processedImage, dx, dy, dw, dh);
        ctx.shadowBlur = 0;
    }

    // 3. 創新排版邏輯
    ctx.fillStyle = currentStyle.fontColor;
    ctx.textBaseline = "top";

    if (currentStyle.layout === "vertical" && type === 'portrait') {
        // --- 日系縱排設計 ---
        ctx.textAlign = "right";
        ctx.font = `900 ${w * 0.12}px "Noto Sans TC"`;
        drawTextVertical(ctx, data.title, w * 0.85, h * 0.1, w * 0.12);
        
        ctx.textAlign = "left";
        ctx.font = `bold ${w * 0.05}px "Noto Sans TC"`;
        ctx.fillText(`${data.date} ｜ ${data.time}`, w * 0.1, h * 0.1);
        ctx.font = `900 ${w * 0.08}px "Noto Sans TC"`;
        ctx.fillText(data.name, w * 0.1, h * 0.18);

    } else if (currentStyle.layout === "grid") {
        // --- 瑞士現代主義排版 ---
        ctx.textAlign = "left";
        ctx.font = `900 ${w * 0.14}px "Noto Sans TC"`;
        ctx.fillText(data.title.substring(0,4), w * 0.05, h * 0.05);
        ctx.fillText(data.title.substring(4), w * 0.05, h * 0.05 + w*0.15);
        
        ctx.beginPath(); ctx.lineWidth = 10; ctx.moveTo(w*0.05, h*0.35); ctx.lineTo(w*0.3, h*0.35); ctx.stroke();
        
        ctx.font = `bold ${w * 0.06}px "Noto Sans TC"`;
        ctx.fillText(data.name, w * 0.05, h * 0.4);
        ctx.font = `300 ${w * 0.04}px "Noto Sans TC"`;
        ctx.fillText(`${data.date} AT ${data.time}`, w * 0.05, h * 0.48);

    } else {
        // --- 通用大膽排版 (用於橫式或幾何風格) ---
        ctx.textAlign = (type === 'portrait') ? "center" : "left";
        const startX = (type === 'portrait') ? w/2 : w * 0.05;
        
        ctx.font = `900 ${w * 0.1}px "Noto Sans TC"`;
        ctx.fillText(data.title, startX, h * 0.1);
        
        ctx.font = `bold ${w * 0.07}px "Noto Sans TC"`;
        ctx.fillStyle = currentStyle.accentColor;
        ctx.fillText(data.name, startX, h * 0.25);
        
        ctx.fillStyle = currentStyle.fontColor;
        ctx.font = `bold ${w * 0.05}px "Noto Sans TC"`;
        ctx.fillText(`${data.date}  ${data.time}`, startX, h * 0.35);
    }
    
    // 裝飾外框 (一律繁體中文標註)
    ctx.strokeStyle = currentStyle.fontColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(w*0.02, w*0.02, w*0.96, h-w*0.04);
}

// 支援縱排文字的輔助函式
function drawTextVertical(ctx, text, x, y, fontSize) {
    for (let i = 0; i < text.length; i++) {
        ctx.fillText(text[i], x, y + i * fontSize * 1.1);
    }
}

function download(id) {
    const link = document.createElement('a');
    link.download = `AI海報-${Date.now()}.png`;
    link.href = document.getElementById(id).toDataURL('image/png');
    link.click();
}
