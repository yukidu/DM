// 初始化：設定目前時間
window.onload = () => {
    const now = new Date();
    document.getElementById('date').value = now.toISOString().split('T')[0];
    document.getElementById('time').value = now.toTimeString().slice(0, 5);
};

let selectedImg = null;

// 定義世界級藝術風格
const ART_STYLES = [
    { name: "極簡包浩斯", bg: "#F2F2F2", text: "#1A1A1A", accent: "#E63946", font: "Noto Sans TC" },
    { name: "印象派梵谷", bg: "#1B4965", text: "#FFFFFF", accent: "#F9C74F", font: "Noto Sans TC" },
    { name: "現代瑞士", bg: "#FFFFFF", text: "#000000", accent: "#2563EB", font: "Noto Sans TC" },
    { name: "日系和風", bg: "#F8F1E7", text: "#433D3C", accent: "#BC6C25", font: "Noto Sans TC" },
    { name: "霓虹未來", bg: "#0D0D0D", text: "#00F5FF", accent: "#FF007F", font: "Noto Sans TC" }
];

// 照片上傳處理 (包含進度條)
document.getElementById('photoUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const wrapper = document.getElementById('progressWrapper');
    const bar = document.getElementById('progressBar');
    const percent = document.getElementById('progressPercent');
    const statusText = document.getElementById('uploadText');

    // 重設並顯示進度條
    wrapper.classList.remove('hidden');
    bar.style.width = '0%';
    percent.innerText = '0%';
    statusText.innerText = "⏳ 正在處理照片...";

    const reader = new FileReader();

    // 監聽讀取進度
    reader.onprogress = (event) => {
        if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            bar.style.width = progress + '%';
            percent.innerText = progress + '%';
        }
    };

    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            selectedImg = img;
            bar.style.width = '100%';
            percent.innerText = '100%';
            statusText.innerText = "✅ 照片上傳成功";
            document.getElementById('msg').innerText = "照片載入完成。";
        };
        img.src = event.target.result;
    };

    reader.onerror = () => {
        alert("照片讀取失敗，請重新嘗試。");
    };

    reader.readAsDataURL(file);
});

// 生成海報邏輯
document.getElementById('generateBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim();
    const title = document.getElementById('eventTitle').value.trim();
    const name = document.getElementById('name').value.trim();

    if (!title || !name) return alert("請填寫活動名稱與姓名！");
    if (!selectedImg) return alert("請先上傳照片！");

    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    btnText.innerText = "正在設計海報...";
    loader.classList.remove('hidden');

    const style = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
    let slogan = "跨越邊界，看見未來"; // 保底標語

    // 呼叫 Gemini API (修正為 v1 穩定路徑)
    if (key) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `你是一位資深文案。活動名稱「${title}」，講者「${name}」。請寫一句非常有質感的繁體中文海報標語（8個字內），只回傳文字內容。` }] }]
                })
            });
            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                slogan = data.candidates[0].content.parts[0].text.trim();
            }
        } catch (err) {
            console.error("API 請求失敗，使用保底標語。");
        }
    }

    // 繪製海報
    renderPoster('pCanvas', title, name, slogan, style);
    renderPoster('lCanvas', title, name, slogan, style);

    document.getElementById('resultArea').style.display = 'grid';
    btnText.innerText = "生成專屬宣傳海報";
    loader.classList.add('hidden');

    window.scrollTo({ top: document.getElementById('resultArea').offsetTop - 50, behavior: 'smooth' });
});

function renderPoster(canvasId, title, name, slogan, style) {
    const cvs = document.getElementById(canvasId);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isPortrait = h > w;

    // 1. 背景與裝飾
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, w, h);

    // 2. 風格裝飾色塊
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.arc(isPortrait ? w : 0, 0, w * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 3. 繪製照片 (填滿指定區域)
    if (selectedImg) {
        const ratio = isPortrait ? (w * 0.9) / selectedImg.width : (h * 0.8) / selectedImg.height;
        const dw = selectedImg.width * ratio;
        const dh = selectedImg.height * ratio;
        const dx = isPortrait ? (w - dw) / 2 : w - dw - 50;
        const dy = h - dh;
        
        ctx.save();
        // 簡單裁切效果
        ctx.drawImage(selectedImg, dx, dy, dw, dh);
        ctx.restore();
    }

    // 4. 文字排版
    ctx.fillStyle = style.text;
    ctx.textAlign = isPortrait ? "center" : "left";
    const xPos = isPortrait ? w / 2 : 80;

    // 活動標題
    ctx.font = `900 ${w * 0.08}px "Noto Sans TC"`;
    ctx.fillText(title, xPos, h * 0.16);

    // AI 標語
    ctx.fillStyle = style.accent;
    ctx.font = `700 ${w * 0.045}px "Noto Sans TC"`;
    ctx.fillText(slogan, xPos, h * 0.23);

    // 主講人
    ctx.fillStyle = style.text;
    ctx.font = `900 ${w * 0.06}px "Noto Sans TC"`;
    ctx.fillText(`講者｜${name}`, xPos, h * 0.33);

    // 時間日期
    const date = document.getElementById('date').value.replace(/-/g, '.');
    const time = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.035}px "Noto Sans TC"`;
    ctx.fillText(`${date} AT ${time}`, xPos, h * 0.40);

    // 外框線
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 15;
    ctx.strokeRect(40, 40, w - 80, h - 80);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `AI-Poster-${id}.png`;
    link.href = document.getElementById(id).toDataURL('image/png');
    link.click();
}
