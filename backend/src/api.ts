import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { fetchAmazon } from './index';
import type { AmazonProductModel } from './models/amazon-product-model';

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

app.get('/api/scrape', async (
    req: Request<unknown, { error: string } | { keyword: string; count: number; products: AmazonProductModel[] }, unknown, { keyword?: string; retries?: string }>,
    res: Response<{ error: string } | { keyword: string; count: number; products: AmazonProductModel[] }>
) => {
    try {
        const keyword = (req.query.keyword ?? '').trim();
        if (!keyword) {
            return res.status(400).json({error: 'Parâmetro "keyword" é obrigatório'})
        }

        const retriesStr = req.query.retries;
        const retriesNum = Number(retriesStr)
        const retries = Number.isFinite(retriesNum) ? Math.max(0, Math.min(5, retriesNum)) : 3;

        const products: AmazonProductModel[] = await fetchAmazon(keyword, retries);

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
            keyword,
            count: products.length,
            products
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro Desconhecido.';
        return res.status(502).json({error: msg});
    }
})

app.get('/health', (_req, res) => res.status(200).send('ok'));

app.listen(port, () => {
    console.log(`Listening on: http://localhost:${port}`);
})

export default app;

