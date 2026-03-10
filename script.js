// 初始化時間
const now = new Date();
document.getElementById('date').value = now.toISOString().split('T')[0];
document.getElementById('time').value = now.toTimeString().slice(0, 5);

let globalImg = null;

// 1. 照片載入 (修正版：一選取就生效)
document.getElementById('photoUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const uploadText = document.getElementById('uploadText');
    const dropZone = document.getElementById('dropZone');
    
    uploadText.innerText = "⏳ 照片載入中...";
    
    const img = new Image();
    img.onload = function() {
        globalImg = img;
        uploadText.innerText = "✅ 照片已就緒";
        dropZone.classList.add('bg-blue-50', 'border-blue-300');
        console.log("圖片載入成功");
    };
    img.onerror = () => alert("圖片格式不支援，請更換一張。");
    img.src = URL.createObjectURL(file);
});

// 2. 隨機風格與生成按鈕 (共用邏輯)
document.getElementById('generateBtn').addEventListener('click', () => callGeminiDesigner(false));
document.getElementById('randomStyleBtn').addEventListener('click', () => callGeminiDesigner(true));

async function callGeminiDesigner(isRandom) {
    const key = document.getElementById('apiKey').value.trim();
    const title = document.getElementById('eventTitle').value.trim();
    const name = document.getElementById('name').value.trim();

    if (!key) return alert("請輸入 Gemini API 金鑰");
    if (!title || !name) return alert("請完整填寫活動名稱與姓名");
    if (!globalImg) return alert("請先上傳主講人照片！");

    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const aiStatus = document.getElementById('aiStatus');

    btnText.innerText = isRandom ? "隨機設計中..." : "AI 設計中...";
    loader.classList.remove('hidden');
    aiStatus.innerText = "🤖 AI 正根據活動主題思考配色方案...";

    // 風格候選庫
    const artVibes = ["梵谷星空", "包浩斯簡約", "莫蘭迪高級灰", "賽博龐克霓虹", "瑞士國際主義", "日系禪意", "現代幾何"];
    const chosenVibe = artVibes[Math.floor(Math.random() * artVibes.length)];

    const prompt = `你是一位世界級平面設計師。現在要為活動「${title}」設計海報。
    ${isRandom ? `這次請指定使用「${chosenVibe}」的風格美學。` : `請根據活動內容自動決定風格。`}
    請幫我決定設計基因，並嚴格只回傳以下 JSON 格式：
    {
      "bgColor": "背景色16進位",
      "textColor": "文字主色16進位",
      "accentColor": "裝飾色16進位",
      "slogan": "一句8字內繁體中文標語",
      "fontStyle": "sans-serif 或 serif",
      "layoutType": "split(左右), center(置中), corner(靠角)"
    }`;

    try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await resp.json();
        const rawJson = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        const design = JSON.parse(rawJson);

        aiStatus.innerText = `✨ 已採用 AI 設計方案：「${design.slogan}」`;
        
        // 執行繪製
        renderPoster('pCanvas', title, name, design);
        renderPoster('lCanvas', title, name, design);

        document.getElementById('resultArea').classList.remove('hidden');
        window.scrollTo({ top: document.getElementById('resultArea').offsetTop - 50, behavior: 'smooth' });

    } catch (err) {
        console.error(err);
        alert("AI 設計過程發生問題，可能是金鑰無效或 API 格式變動。");
    } finally {
        btnText.innerText = "啟動 AI 智能設計";
        loader.classList.add('hidden');
    }
}

function renderPoster(id, title, name, design) {
    const cvs = document.getElementById(id);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isP = h > w;

    // A. 背景
    ctx.fillStyle = design.bgColor;
    ctx.fillRect(0, 0, w, h);

    // B. AI 裝飾
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = design.accentColor;
    ctx.beginPath();
    ctx.arc(w * Math.random(), h * 0.2, w * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // C. 構圖邏輯
    let textX, textAlign, imgRatio;
    if (design.layoutType === "split" && !isP) { // 橫式分割
        textX = w * 0.1; textAlign = "left"; 
    } else if (design.layoutType === "corner") { // 靠角
        textX = isP ? w * 0.1 : w * 0.05; textAlign = "left";
    } else { // 置中
        textX = w / 2; textAlign = "center";
    }

    // D. 畫人
    if (globalImg) {
        const ratio = isP ? (w * 0.9) / globalImg.width : (h * 0.9) / globalImg.height;
        const dw = globalImg.width * ratio;
        const dh = globalImg.height * ratio;
        const dx = isP ? (w - dw) / 2 : w - dw;
        const dy = h - dh;
        ctx.drawImage(globalImg, dx, dy, dw, dh);
    }

    // E. 畫文字
    ctx.fillStyle = design.textColor;
    ctx.textAlign = textAlign;
    const fontName = design.fontStyle === "serif" ? "Noto Serif TC" : "Noto Sans TC";

    // 標題
    ctx.font = `900 ${w * 0.09}px "${fontName}"`;
    ctx.fillText(title, textX, h * 0.18);

    // 標語
    ctx.fillStyle = design.accentColor;
    ctx.font = `700 ${w * 0.045}px "Noto Sans TC"`;
    ctx.fillText(design.slogan, textX, h * 0.26);

    // 姓名
    ctx.fillStyle = design.textColor;
    ctx.font = `900 ${w * 0.065}px "${fontName}"`;
    ctx.fillText(name, textX, h * 0.36);

    // 時段
    const date = document.getElementById('date').value.replace(/-/g, '/');
    const time = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.035}px "Noto Sans TC"`;
    ctx.fillText(`${date} ｜ ${time}`, textX, h * 0.44);

    // AI 設計邊框
    ctx.strokeStyle = design.accentColor;
    ctx.lineWidth = 15;
    ctx.strokeRect(40, 40, w - 80, h - 80);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `AI海報-${Date.now()}.png`;
    link.href = document.getElementById(id).toDataURL();
    link.click();
}
