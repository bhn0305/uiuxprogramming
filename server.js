const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const API_KEY = process.env.API_KEY;
const PORT = 3000;

app.get('/api/character', async (req, res) => {
    const nickname = req.query.nickname;
    if (!nickname) {
        return res.status(400).json({ error: '닉네임을 입력해주세요.' });
    }

    try {
        const idRes = await fetch(`https://open.api.nexon.com/maplestory/v1/id?character_name=${encodeURIComponent(nickname)}`, {
            headers: { 'x-nxopen-api-key': API_KEY }
        });
        const idData = await idRes.json();

        if (!idRes.ok || !idData.ocid) {
            return res.status(idRes.status).json(idData);
        }

        const ocid = idData.ocid;

        const [basicRes, schedulerRes] = await Promise.all([
            fetch(`https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocid}`, { headers: { 'x-nxopen-api-key': API_KEY } }),
            fetch(`https://open.api.nexon.com/maplestory/v1/scheduler/character-state?ocid=${ocid}`, { headers: { 'x-nxopen-api-key': API_KEY } })
        ]);

        const basicData = await basicRes.json();
        const schedulerData = schedulerRes.ok ? await schedulerRes.json() : null;

        res.json({
            basic: basicData,
            scheduler: schedulerData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 내부 오류 발생' });
    }
});

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});