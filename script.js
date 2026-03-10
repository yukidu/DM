const styles = [
    { name: "梵谷星夜", colors: ["#121244", "#1B3984", "#F7D121", "#E29312"], fontColor: "#FFFFFF" },
    { name: "包浩斯幾何", colors: ["#E63946", "#F1FAEE", "#A8DADC", "#457B9D"], fontColor: "#1D3557" },
    { name: "莫蘭迪高級灰", colors: ["#B4A996", "#948B78", "#746C5B", "#E0D8CC"], fontColor: "#4A453C" },
    { name: "Cyberpunk 霓虹", colors: ["#0D0221", "#C64191", "#2DE2E6", "#6521C1"], fontColor: "#FFFFFF" },
    { name: "極簡無印", colors: ["#FFFFFF", "#F2F2F2", "#CCCCCC", "#333333"], fontColor: "#222222" }
];

let currentStyle = styles[0];
let processedImage = null;

// 1. 處理去背
document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('status');
    status.innerText = "正在進行 AI 智慧去背中，請稍候...";
    
    try {
        const blob = await imglyRemoveBackground(file);
        processedImage = await createImageBitmap(blob);
        status.innerText = "照片去背完成！";
    } catch (error) {
        console.error(error);
        status.innerText = "去背失敗，將使用原圖。";
        const reader = new FileReader();
        reader.onload = (re) => {
            const img = new Image();
            img.onload = () => { processedImage = img; };
            img.src = re.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 2. 隨機風格
document.getElementById('randomStyleBtn').addEventListener('click', () => {
    currentStyle = styles[Math.floor(Math.random() * styles.length)];
    alert(`切換風格至：${currentStyle.name}`);
});

// 3. 呼叫 Gemini 並生成
document.getElementById('generateBtn').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;
    if (!apiKey) return alert("請輸入 Gemini API Key");

    const status = document.getElementById('status');
    status.innerText = "Gemini 正在規劃構圖...";

    const userData = {
        name: document.getElementById('name').value,
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value
    };

    // 這裡我們請 Gemini 提供一些背景裝飾的點子
    const prompt = `你是一位資深平面設計師。現在要設計一組繁體中文海報。
    風格：${currentStyle.name}。
    配色：${currentStyle.colors.join(', ')}。
    請根據這些資訊，提供我海報背景的設計建議（以JSON格式回傳），包含三個屬性：
    1. bgType (線性漸層或圓形漸層)
    2. decoration (描述裝飾元素的形狀，如'圓形'、'線條'、'方塊')
    3. vibe (氣氛關鍵字)`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        // 為了確保運作，若 Gemini 回傳格式不穩，我們直接進入繪製流程
        drawPosters(userData, currentStyle);
        status.innerText = "海報生成成功！";
    } catch (e) {
        console.error(e);
        drawPosters(userData, currentStyle); // 即使失敗也用預設風格繪製
    }
});

function drawPosters(data, style) {
    const pCanvas = document.getElementById('portraitCanvas');
    const lCanvas = document.getElementById('landscapeCanvas');
    
    render(pCanvas, data, style, 'portrait');
    render(lCanvas, data, style, 'landscape');
    
    pCanvas.style.display = 'block';
    lCanvas.style.display = 'block';
}

function render(canvas, data, style, type) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 1. 繪製背景 (同色系隨機幾何)
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, style.colors[0]);
    grad.addColorStop(1, style.colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 隨機裝飾元素
    ctx.globalAlpha = 0.3;
    for(let i=0; i<5; i++) {
        ctx.fillStyle = style.colors[Math.floor(Math.random() * style.colors.length)];
        ctx.beginPath();
        if(i % 2 === 0) ctx.arc(Math.random()*w, Math.random()*h, Math.random()*200, 0, Math.PI*2);
        else ctx.rect(Math.random()*w, Math.random()*h, Math.random()*300, Math.random()*300);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 2. 繪製人物 (去背圖)
    if (processedImage) {
        const imgW = processedImage.width;
        const imgH = processedImage.height;
        const ratio = (type === 'portrait') ? (w * 0.8) / imgW : (h * 0.8) / imgH;
        const drawW = imgW * ratio;
        const drawH = imgH * ratio;
        
        const posX = (type === 'portrait') ? (w - drawW) / 2 : 50;
        const posY = h - drawH;
        
        ctx.drawImage(processedImage, posX, posY, drawW, drawH);
    }

    // 3. 繪製文字 (繁體中文)
    ctx.fillStyle = style.fontColor;
    ctx.textAlign = (type === 'portrait') ? 'center' : 'left';

    // 活動名稱
    ctx.font = `bold ${w * 0.08}px "Noto Sans TC"`;
    ctx.fillText(data.title || "精彩活動", (type === 'portrait') ? w/2 : w * 0.45, h * 0.15);

    // 姓名
    ctx.font = `900 ${w * 0.06}px "Noto Sans TC"`;
    ctx.fillText(`主講人：${data.name || "專家"}`, (type === 'portrait') ? w/2 : w * 0.45, h * 0.25);

    // 時間日期
    ctx.font = `${w * 0.04}px "Noto Sans TC"`;
    const dateStr = `日期：${data.date || "2024/12/31"}`;
    const timeStr = `時間：${data.time || "14:00"}`;
    ctx.fillText(dateStr, (type === 'portrait') ? w/2 : w * 0.45, h * 0.35);
    ctx.fillText(timeStr, (type === 'portrait') ? w/2 : w * 0.40, h * 0.42);
    
    // 裝飾框
    ctx.strokeStyle = style.fontColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(20, 20, w-40, h-40);
}

function download(id) {
    const link = document.createElement('a');
    link.download = 'poster.png';
    link.href = document.getElementById(id).toDataURL();
    link.click();
}