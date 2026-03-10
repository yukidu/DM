// 1. 初始化日期與時間
window.addEventListener('load', () => {
    const dt = new Date();
    document.getElementById('date').value = dt.toISOString().split('T')[0];
    document.getElementById('time').value = dt.toTimeString().slice(0, 5);
});

// 全域變數存儲圖片
let globalImg = null;

// 風格配置
const STYLES = [
    { name: "現代簡約", bg: "#FFFFFF", text: "#000000", accent: "#3B82F6", font: "Noto Sans TC" },
    { name: "黑金權威", bg: "#1A1A1A", text: "#FFFFFF", accent: "#D4AF37", font: "Noto Serif TC" },
    { name: "活力潮流", bg: "#FF3E00", text: "#FFFFFF", accent: "#000000", font: "Noto Sans TC" },
    { name: "和風雅緻", bg: "#F8F1E7", text: "#433D3C", accent: "#BC6C25", font: "Noto Serif TC" }
];

// 2. 照片上傳處理 (保底機制：一選圖就生效)
document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('uploadStatus');
    const msg = document.getElementById('msg');
    
    // A. 立即載入原始圖作為保底，防止生成時報錯
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => { 
            globalImg = img; 
            statusText.innerText = "✅ 照片已載入";
            statusText.parentElement.parentElement.classList.add('bg-blue-50', 'border-blue-400');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    // B. 嘗試背景去除 (在後台跑，成功後會自動替換掉 globalImg)
    msg.innerText = "正在嘗試 AI 智慧去背...";
    try {
        const blob = await Promise.race([
            imglyRemoveBackground(file),
            new Promise((_, j) => setTimeout(() => j(new Error("Timeout")), 8000))
        ]);
        const transparentImg = await createImageBitmap(blob);
        globalImg = transparentImg; // 成功後替換成去背圖
        msg.innerText = "AI 去背成功！海報將更精美。";
    } catch (err) {
        console.warn("去背跳過:", err);
        msg.innerText = "去背環境限制，將使用原圖生成。";
    }
});

// 3. 生成按鈕
document.getElementById('generateBtn').addEventListener('click', async () => {
    // 取得所有欄位
    const key = document.getElementById('apiKey').value.trim();
    const title = document.getElementById('eventTitle').value.trim();
    const name = document.getElementById('name').value.trim();

    // 嚴格檢查是否漏填 (尤其是 globalImg)
    if (!title) return alert("請輸入活動名稱");
    if (!name) return alert("請輸入主講人姓名");
    if (!globalImg) return alert("請上傳主講人照片");

    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    btnText.innerText = "設計中...";
    loader.classList.remove('hidden');

    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    let slogan = "創新未來，共創精彩"; // 預設標語

    // 4. 串接 Gemini API
    if (key) {
        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `活動：「${title}」，講者：「${name}」。寫一句繁體中文標語（8字內）。只回傳文字。` }] }]
                })
            });
            const resData = await resp.json();
            if (resData.candidates && resData.candidates[0].content.parts[0].text) {
                slogan = resData.candidates[0].content.parts[0].text.trim();
            }
        } catch (err) {
            console.error("API 失敗，改用預設標語");
        }
    }

    // 5. 開始繪圖
    render('pCanvas', title, name, slogan, style);
    render('lCanvas', title, name, slogan, style);

    // 顯示結果
    document.getElementById('resultArea').style.display = 'block';
    btnText.innerText = "生成宣傳海報";
    loader.classList.add('hidden');
    
    // 自動跳轉
    setTimeout(() => {
        window.scrollTo({ top: document.getElementById('resultArea').offsetTop - 20, behavior: 'smooth' });
    }, 200);
});

function render(id, title, name, slogan, style) {
    const cvs = document.getElementById(id);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isP = h > w;

    // 清空背景
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, w, h);

    // 裝飾圓形
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.arc(w * 0.9, h * 0.1, w * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 畫人物
    if (globalImg) {
        const ratio = isP ? (w * 0.9) / globalImg.width : (h * 0.85) / globalImg.height;
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

    ctx.font = `900 ${w * 0.09}px "Noto Sans TC", sans-serif`;
    ctx.fillText(title, x, h * 0.18);

    ctx.fillStyle = style.accent;
    ctx.font = `700 ${w * 0.045}px "Noto Sans TC", sans-serif`;
    ctx.fillText(slogan, x, h * 0.25);

    ctx.fillStyle = style.text;
    ctx.font = `900 ${w * 0.07}px "Noto Sans TC", sans-serif`;
    ctx.fillText(name, x, h * 0.35);

    const date = document.getElementById('date').value.replace(/-/g, '/');
    const time = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.038}px "Noto Sans TC", sans-serif`;
    ctx.fillText(`${date} ｜ ${time}`, x, h * 0.43);

    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 15;
    ctx.strokeRect(40, 40, w - 80, h - 80);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `海報-${id}.png`;
    link.href = document.getElementById(id).toDataURL('image/png');
    link.click();
}
