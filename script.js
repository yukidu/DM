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

// 照片上傳處理 (穩定版)
document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('uploadStatus');
    const msg = document.getElementById('msg');
    
    statusText.innerText = "⏳ 處理中...";
    msg.innerText = "正在處理照片，請稍候...";

    // 建立一個讀取原圖的 function 作為保底
    const loadOriginal = (f) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => { globalImg = img; };
            img.src = event.target.result;
        };
        reader.readAsDataURL(f);
    };

    try {
        // 嘗試去背，設定 8 秒超時
        const blob = await Promise.race([
            imglyRemoveBackground(file),
            new Promise((_, j) => setTimeout(() => j(new Error("Timeout")), 8000))
        ]);
        globalImg = await createImageBitmap(blob);
        statusText.innerText = "✅ 去背完成";
        msg.innerText = "照片已就緒。";
    } catch (err) {
        console.warn("去背失敗或超時，切換至原圖模式");
        statusText.innerText = "⚠️ 使用原圖";
        msg.innerText = "去背失敗，已自動使用原圖。";
        loadOriginal(file);
    }
});

// 生成按鈕 (修正 API 路徑並加入保底)
document.getElementById('generateBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value;
    const title = document.getElementById('eventTitle').value || "精彩活動";
    const name = document.getElementById('name').value || "神祕嘉賓";

    if (!globalImg) {
        alert("請先上傳照片！");
        return;
    }

    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    const msg = document.getElementById('msg');
    
    btnText.innerText = "設計中...";
    loader.classList.remove('hidden');

    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    let slogan = "夢想啟航，精彩無限"; // 預設保底口號

    if (key) {
        try {
            // 修正為 v1 版本路徑
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `活動名稱「${title}」，講者「${name}」。請寫一句吸引人的繁體中文短標語（8字內）。只回傳文字內容。` }] }]
                })
            });
            const resData = await resp.json();
            
            if (resData.candidates && resData.candidates[0].content.parts[0].text) {
                slogan = resData.candidates[0].content.parts[0].text.trim();
            }
        } catch (err) {
            console.error("AI 標語生成失敗，使用預設口號:", err);
            msg.innerText = "API 調用失敗，已使用預設口號生成海報。";
        }
    } else {
        msg.innerText = "未輸入金鑰，使用預設風格生成。";
    }

    // 渲染畫布 (無論 API 是否成功都會執行)
    render('pCanvas', title, name, slogan, style);
    render('lCanvas', title, name, slogan, style);

    document.getElementById('resultArea').style.display = 'block';
    btnText.innerText = "生成宣傳海報";
    loader.classList.add('hidden');
    
    // 平滑捲動到結果
    setTimeout(() => {
        window.scrollTo({ top: document.getElementById('resultArea').offsetTop - 50, behavior: 'smooth' });
    }, 100);
});

function render(id, title, name, slogan, style) {
    const cvs = document.getElementById(id);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isP = h > w;

    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, w, h);

    // 藝術裝飾
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.2, w * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 繪製人物
    if (globalImg) {
        const ratio = isP ? (w * 0.9) / globalImg.width : (h * 0.85) / globalImg.height;
        const dw = globalImg.width * ratio;
        const dh = globalImg.height * ratio;
        const dx = isP ? (w - dw) / 2 : w * 0.5;
        const dy = h - dh;
        
        ctx.save();
        ctx.drawImage(globalImg, dx, dy, dw, dh);
        ctx.restore();
    }

    // 文字排版
    ctx.fillStyle = style.text;
    ctx.textAlign = isP ? "center" : "lef
