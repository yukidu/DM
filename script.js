// 預設日期
window.onload = () => {
    const n = new Date();
    document.getElementById('date').value = n.toISOString().split('T')[0];
    document.getElementById('time').value = n.toTimeString().slice(0, 5);
};

let userImg = null;

// 照片處理 (包含進度顯示)
document.getElementById('photoUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const bar = document.getElementById('progressBar');
    document.getElementById('progressContainer').classList.remove('hidden');
    
    const reader = new FileReader();
    reader.onprogress = (ev) => {
        if (ev.lengthComputable) bar.style.width = (ev.loaded / ev.total * 100) + '%';
    };
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            userImg = img;
            document.getElementById('uploadText').innerText = "✅ 照片已就緒";
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// 點擊生成
document.getElementById('generateBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value;
    const title = document.getElementById('eventTitle').value;
    const name = document.getElementById('name').value;

    if (!key || !title || !name || !userImg) return alert("請填寫所有資料並上傳照片");

    const status = document.getElementById('aiStatus');
    const loader = document.getElementById('loader');
    status.innerText = "🤖 Gemini 正在設計視覺風格與配色...";
    loader.classList.remove('hidden');

    try {
        // --- 請 AI 擔任視覺設計師 ---
        const prompt = `你是一位資深平面設計大師。請為活動「${title}」設計海報視覺。
        請根據活動主題，決定最適合的配色與排版邏輯。
        請嚴格只回傳以下 JSON 格式，不要有任何解釋文字：
        {
          "bgColor": "背景色16進位",
          "textColor": "標題文字色16進位",
          "accentColor": "裝飾元素色16進位",
          "slogan": "一句8字內繁體中文標語",
          "decorationType": "幾何圖形類型(circle/stripe/dots)",
          "layoutMode": "構圖模式(split/center/asymmetric)"
        }`;

        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await resp.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        const design = JSON.parse(aiResponse.replace(/```json|```/g, ''));

        status.innerText = `✨ AI 設計師已套用「${design.slogan}」風格方案`;
        
        // 開始依據 AI 的指令繪製
        render('pCanvas', title, name, design);
        render('lCanvas', title, name, design);

        document.getElementById('resultArea').classList.remove('hidden');
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err) {
        console.error(err);
        alert("AI 設計過程出錯，請檢查金鑰或嘗試重新生成");
    } finally {
        loader.classList.add('hidden');
    }
});

function render(id, title, name, design) {
    const cvs = document.getElementById(id);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isP = h > w;

    // 1. AI 決定背景色
    ctx.fillStyle = design.bgColor;
    ctx.fillRect(0, 0, w, h);

    // 2. AI 決定裝飾元素
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = design.accentColor;
    if (design.decorationType === "circle") {
        ctx.beginPath(); ctx.arc(w*Math.random(), h*Math.random(), w*0.5, 0, Math.PI*2); ctx.fill();
    } else if (design.decorationType === "stripe") {
        for(let i=0; i<w; i+=w/10) ctx.fillRect(i, 0, 10, h);
    } else {
        for(let i=0; i<100; i++) ctx.fillRect(Math.random()*w, Math.random()*h, 5, 5);
    }
    ctx.globalAlpha = 1.0;

    // 3. AI 決定構圖模式 (Layout Logic)
    let textX, textAlign, imgX, imgY;
    if (design.layoutMode === "split" && !isP) { // 橫式分割
        textX = w * 0.08; textAlign = "left"; imgX = w * 0.5; imgY = h * 0.1;
    } else if (design.layoutMode === "asymmetric") { // 非對稱
        textX = isP ? w/2 : w * 0.1; textAlign = isP ? "center" : "left"; imgX = isP ? 0 : w*0.4; imgY = h*0.2;
    } else { // 居中
        textX = w/2; textAlign = "center"; imgX = (w-w*0.8)/2; imgY = h*0.3;
    }

    // 4. 繪製照片
    if (userImg) {
        const ratio = isP ? (w * 0.8) / userImg.width : (h * 0.8) / userImg.height;
        ctx.drawImage(userImg, isP ? (w - userImg.width*ratio)/2 : w*0.5, h - userImg.height*ratio, userImg.width*ratio, userImg.height*ratio);
    }

    // 5. 繪製文字 (AI 配色與文案)
    ctx.fillStyle = design.textColor;
    ctx.textAlign = textAlign;

    // 標題 (使用大標排版)
    ctx.font = `900 ${w * 0.09}px "Noto Sans TC"`;
    ctx.fillText(title, textX, h * 0.15);

    // 標語 (AI 創意思維)
    ctx.fillStyle = design.accentColor;
    ctx.font = `700 ${w * 0.045}px "Noto Sans TC"`;
    ctx.fillText(design.slogan, textX, h * 0.22);

    // 姓名
    ctx.fillStyle = design.textColor;
    ctx.font = `900 ${w * 0.065}px "Noto Sans TC"`;
    ctx.fillText(name, textX, h * 0.32);

    // 日期時間
    const d = document.getElementById('date').value;
    const t = document.getElementById('time').value;
    ctx.font = `400 ${w * 0.035}px "Noto Sans TC"`;
    ctx.fillText(`${d} | ${t}`, textX, h * 0.4);

    // AI 裝飾邊框
    ctx.strokeStyle = design.accentColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, w-60, h-60);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `AI_Poster_${id}.png`;
    link.href = document.getElementById(id).toDataURL();
    link.click();
}
