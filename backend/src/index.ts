import axios, { AxiosError, type RawAxiosRequestHeaders } from 'axios';
import { JSDOM } from 'jsdom';
import https from 'https';
import type { AmazonProductModel } from './models/amazon-product-model';
import type { AmazonProductEntity } from './entities/amazon-product-entity';
import { amazonProductDto } from './dtos/amazon-product-dto';

// Configurações necessárias para que reduza drásticamente o bloqueio pela quantidade de requisições
const agent = new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    rejectUnauthorized: false
});

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
];

const getRandomHeaders = () => ({
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'TE': 'trailers'
});

const parseProduct = (div: HTMLDivElement): AmazonProductEntity => {
    const title = div.querySelector('h2')?.getAttribute('aria-label');
    const rating = div.querySelector('.a-icon-alt')?.textContent ?? null;
    const review = div.querySelector('a.s-underline-text span.a-size-base')?.textContent ?? null;
    const image = div.querySelector<HTMLImageElement>('img.s-image')?.getAttribute('src');

    return {
        title,
        rating,
        review,
        image,
    };
}

//A função receberá uma string com valor keyword, que será a palavra pesquisada no site
export const fetchAmazon = async (keyword: string, retries = 3): Promise<AmazonProductModel[]> => {
    const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(keyword)}`;

    try {
        const response = await axios.get<string>(url,
            {
                httpsAgent: agent,
                headers: getRandomHeaders(),
                timeout: 5000,

                transformRequest: [(data, headers) => {
                    if (retries < 3 && headers) {
                        (headers as RawAxiosRequestHeaders)['Cache-Control'] = 'no-cache';
                    }
                    return data;
                },]
            });

        const dom = new JSDOM(response.data);
        const { document } = dom.window;

        //Captura os itens na página a partir da existencia do atributo data-asin
        const elements = document.querySelectorAll<HTMLDivElement>(
            'div.s-result-item[data-asin]:not([data-asin=""])'
        );

        // 1) DOM -> Entity
        const entities: AmazonProductEntity[] = Array.from(elements).map(parseProduct);

        // 2) Entity -> Model (seu DTO faz a normalização e padroniza campos)
        const products: AmazonProductModel[] = entities.map(amazonProductDto.fromEntity);

        console.log("Product list found!");
        return products;
    } catch (err) {
        if (retries > 0) {
            console.log(`Retrying... (${retries} attempts left)`);
            //Aumenta o tempo para a próxima requisição a partir de uma falha
            await new Promise(resolve => setTimeout(resolve, 10000 * (4 - retries)));
            return fetchAmazon(keyword, retries - 1);
        }
        if (axios.isAxiosError(err)) {
            const axErr = err as AxiosError;
            console.log(`Failed after 3 attempts: ${axErr.message}`)
            throw new Error(`Failed after 3 attempts: ${axErr.message}`);
        }

        throw err;
    }
}