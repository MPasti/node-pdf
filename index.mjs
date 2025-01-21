import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json({ limit: '10mb' }));

const processJsonFile = (filePath, outputDir) => {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        if (!jsonData.success || !jsonData.data || !jsonData.data.arquivo || !jsonData.data.arquivo.data) {
            console.error(`Formato inválido no arquivo ${filePath}`);
            return;
        }

        const bufferData = jsonData.data.arquivo.data;

        if (!Array.isArray(bufferData) || !bufferData.every(Number.isInteger)) {
            console.error(`O buffer deve ser um array de números inteiros no arquivo ${filePath}`);
            return;
        }

        const pdfBuffer = Buffer.from(bufferData);
        const outputFilePath = path.join(outputDir, `output_${Date.now()}.pdf`);

        fs.writeFileSync(outputFilePath, pdfBuffer);
        console.log(`PDF salvo com sucesso em: ${outputFilePath}`);
    } catch (error) {
        console.error(`Erro ao processar o arquivo ${filePath}:`, error);
    }
};

const watchFolder = () => {
    const inputDir = path.join(__dirname, 'respostas');
    const outputDir = path.join(__dirname, 'convertidos');

    if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir);
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const watcher = chokidar.watch(inputDir, {
        persistent: true,
        ignored: /^\./,
        ignoreInitial: false,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
        },
    });

    watcher.on('add', (filePath) => {
        console.log(`Novo arquivo detectado: ${filePath}`);
        processJsonFile(filePath, outputDir);

        fs.unlinkSync(filePath);
    });

    console.log(`Monitorando a pasta: ${inputDir}`);
};

app.post('/create-pdf', (req, res) => {
    try {
        const { buffer } = req.body;

        if (!Array.isArray(buffer) || !buffer.every(Number.isInteger)) {
            return res.status(400).json({ success: false, message: 'O buffer deve ser um array de números inteiros.' });
        }

        const pdfBuffer = Buffer.from(buffer);

        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const filePath = path.join(outputDir, `output_${Date.now()}.pdf`);

        fs.writeFileSync(filePath, pdfBuffer);

        res.json({ message: 'PDF salvo com sucesso!', filePath });
    } catch (error) {
        console.error('Erro ao salvar o PDF:', error);
        res.status(500).json({ sucess: false, message: 'Erro ao salvar o PDF.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    watchFolder();
});
