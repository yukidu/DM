// 1. 初始化：自動填入目前的日期與時間
window.onload = () => {
    const now = new Date();
    document.getElementById('date').value = now.toISOString().split('T')[0];
    document.getElementById('time').value = now.toTimeString().slice(0, 5);
};

let processedImage = null;

// 2. 世界級設計風格定義
const artStyles = [
    { name: "現代極簡", main: "#ffffff", sub: "#000000", accent: "#ff3e00", font: "Noto Sans TC" },
    { name: "梵谷星空", main: "#0f2027", sub: "#203a43", accent: "#f8b500", font: "Noto Serif TC" },
    { name: "包浩斯幾何", main: "#e0e0e0", sub: "#ea3323", accent: "#00559a", font: "Noto Sans TC" },
    { name: "莫蘭迪粉紫", main: "#b5a397", sub: "#948b78", accent: "#4a4e69", font: "Noto Serif TC" },
    { name: "未來賽博", main: "#000000", sub: "#bc00dd", accent: "#00f5ff", font: "Noto Sans TC" }
];

// 3. 自動去背處理
document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('uploadStatus');
    status.innerText = "⏳ AI 正在去除背景...";
    try {
        const blob = await imglyRemoveBackground(file);
        processedImage = await createImageBitmap(blob);
        status.innerText = "✅ 照片去背成功！";
    } catch (err) {
        status.innerText = "❌ 去背失敗，請更換照片";
    }
});

// 4. 生成按鈕點擊
document.getElementById('generateBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value;
    const title = document.getElementById('eventTitle').value;
    const name = document.getElementById('name').value;
    
    if (!key || !title || !name) return alert("請填寫所有欄位並貼上 API Key");
    if (!processedImage) return alert("請先上傳照片");

    const status = document.getElementById('status');
    status.innerText = "🎨 Gemini 正在構思藝術風格...";

    // 隨機選取一種藝術風格
    const style = artStyles[Math.floor(Math.random() * artStyles.length)];

    try {
        // 真實串接 Gemini 獲取風格描述（雖然主要靠我們定義的風格，但讓 AI 參與細節決定）
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `你是一位藝術大師。請為活動「${title}」建議一個與「${style.name}」風格相符的繁體中文宣傳標語，不超過10個字，只需回傳文字。` }] }]
            })
        });
        
        const resData = await response.json();
        const aiSlogan = resData.candidates[0].content.parts[0].text.trim() || "一場靈魂的饗宴";

        // 開始繪圖
        renderPoster('portraitCanvas', title, name, aiSlogan, style);
        renderPoster('landscapeCanvas', title, name, aiSlogan, style);

        document.getElementById('resultArea').style.display = 'grid';
        status.innerText = `✨ 已成功生成：${style.name}風格`;
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    } catch (err) {
        console.error(err);
        status.innerText = "❌ API 金鑰無效或網路問題，請檢查 Key。";
    }
});

function renderPoster(canvasId, title, name, slogan, style) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const isPortrait = h > w;

    // A. 背景與裝飾
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, style.main);
    grad.addColorStop(1, style.sub);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 隨機藝術色塊
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    if(style.name === "包浩斯幾何") {
        ctx.fillRect(w*0.1, h*0.1, w*0.8, h*0.2);
    } else {
        ctx.arc(w, 0, w*0.8, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // B. 人物繪製 (放置於底部)
    const pW = processedImage.width;
    const pH = processedImage.height;
    const ratio = (isPortrait ? w : h * 1.2) / pW;
    const dw = pW * ratio;
    const dh = pH * ratio;
    ctx.drawImage(processedImage, (w - dw) / 2, h - dh, dw, dh);

    // C. 文字排版 (繁體中文)
    ctx.fillStyle = (style.main === "#ffffff") ? "#000000" : "#ffffff";
    ctx.textAlign = isPortrait ? "center" : "left";
    const startX = isPortrait ? w / 2 : w * 0.08;

    // 活動名稱 (大標)
    ctx.font = `900 ${w * 0.09}px "${style.font}"`;
    ctx.fillText(title, startX, h * 0.15);

    // AI 標語
    ctx.font = `700 ${w * 0.04}px "${style.font}"`;
    ctx.fillStyle = style.accent;
    ctx.fillText(slogan, startX, h * 0.22);

    // 主講人姓名
    ctx.fillStyle = (style.main === "#ffffff") ? "#000000" : "#ffffff";
    ctx.font = `900 ${w * 0.06}px "${style.font}"`;
    ctx.fillText(`主講｜${name}`, startX, h * 0.32);

    // 日期時間 (底部資訊欄)
    const dateStr = document.getElementById('date').value.replace(/-/g, '/');
    const timeStr = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.035}px "Noto Sans TC"`;
    ctx.fillText(`${dateStr} － ${timeStr}`, startX, h * 0.38);

    // 外框裝飾
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, w - 80, h - 80);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `AI海報-${id}.png`;
    link.href = document.getElementById(id).toDataURL('image/png');
    link.click();
}
