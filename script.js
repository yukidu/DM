// 初始化時間
const dt = new Date();
document.getElementById('date').value = dt.toISOString().split('T')[0];
document.getElementById('time').value = dt.toTimeString().slice(0, 5);

let globalImg = null;

// 風格配置
const STYLES = [
    { name: "現代簡約", bg: "#FFFFFF", text: "#000000", accent: "#3B82F6", font: "Noto Sans TC" },
    { name: "黑金權威", bg: "#1A1A1A", text: "#FFFFFF", accent: "#D4AF37", font: "Noto Serif TC" },
    { name: "活力潮流", bg: "#FF3E00", text: "#FFFFFF", accent: "#000000", font: "Noto Sans TC" },
    { name: "和風雅緻", bg: "#F8F1E7", text: "#433D3C", accent: "#BC6C25", font: "Noto Serif TC" }
];

// 照片上傳處理
document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('uploadStatus');
    const msg = document.getElementById('msg');
    
    statusText.innerText = "⏳ 處理中...";
    msg.innerText = "正在嘗試 AI 去背，請稍候...";

    try {
        // 去背
        const blob = await Promise.race([
            imglyRemoveBackground(file),
            new Promise((_, j) => setTimeout(() => j(new Error("Timeout")), 10000))
        ]);
        globalImg = await createImageBitmap(blob);
        statusText.innerText = "✅ 去背完成";
        msg.innerText = "照片已就緒。";
    } catch (err) {
        console.error(err);
        statusText.innerText = "⚠️ 使用原圖";
        msg.innerText = "去背失敗或環境不支援，已改用原圖繼續。";
        
        // 失敗回退：直接讀取原圖
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => { globalImg = img; };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 生成按鈕
document.getElementById('generateBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value;
    const title = document.getElementById('eventTitle').value;
    const name = document.getElementById('name').value;

    if (!key || !title || !name || !globalImg) {
        alert("資料未填寫完整或照片尚未載入完畢！");
        return;
    }

    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    btnText.innerText = "設計中...";
    loader.classList.remove('hidden');

    const style = STYLES[Math.floor(Math.random() * STYLES.length)];

    try {
        // 串接 Gemini
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `活動名稱「${title}」，講者「${name}」。請寫一句極短的繁體中文口號（8字內）。` }] }]
            })
        });
        const resData = await resp.json();
        const slogan = resData.candidates[0].content.parts[0].text.trim();

        // 渲染畫布
        render('pCanvas', title, name, slogan, style);
        render('lCanvas', title, name, slogan, style);

        document.getElementById('resultArea').style.display = 'block';
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err) {
        alert("API 金鑰錯誤或網路異常，請檢查您的金鑰。");
    } finally {
        btnText.innerText = "生成宣傳海報";
        loader.classList.add('hidden');
    }
});

function render(id, title, name, slogan, style) {
    const cvs = document.getElementById(id);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isP = h > w;

    // 背景
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, w, h);

    // 藝術裝飾（隨機色塊）
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.arc(w * Math.random(), h * Math.random(), w * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 繪製人物
    if (globalImg) {
        const ratio = isP ? (w * 0.85) / globalImg.width : (h * 0.8) / globalImg.height;
        const dw = globalImg.width * ratio;
        const dh = globalImg.height * ratio;
        const dx = isP ? (w - dw) / 2 : w * 0.55;
        const dy = h - dh;
        ctx.drawImage(globalImg, dx, dy, dw, dh);
    }

    // 文字排版
    ctx.fillStyle = style.text;
    ctx.textAlign = isP ? "center" : "left";
    const x = isP ? w / 2 : w * 0.08;

    // 標題
    ctx.font = `900 ${w * 0.09}px "${style.font}"`;
    ctx.fillText(title, x, h * 0.18);

    // 標語
    ctx.font = `700 ${w * 0.04}px "${style.font}"`;
    ctx.fillStyle = style.accent;
    ctx.fillText(slogan, x, h * 0.25);

    // 姓名
    ctx.fillStyle = style.text;
    ctx.font = `900 ${w * 0.06}px "${style.font}"`;
    ctx.fillText(`主講｜${name}`, x, h * 0.35);

    // 時段
    const date = document.getElementById('date').value.replace(/-/g, '.');
    const time = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.035}px "Noto Sans TC"`;
    ctx.fillText(`${date} AT ${time}`, x, h * 0.42);

    // 簽名線裝飾
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 10;
    ctx.strokeRect(50, 50, w - 100, h - 100);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `Poster-${id}.png`;
    link.href = document.getElementById(id).toDataURL();
    link.click();
}
