const form = document.getElementById('search-form');
const input = document.getElementById('keyword');
const btn = document.getElementById('search-btn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

let currentAbort = null;

function setLoading(loading) {
	btn.disabled = loading;
	input.disabled = loading;
	statusEl.textContent = loading ? 'Buscando resultados…' : '';
}

function renderProducts({ keyword, count, products }) {
	statusEl.textContent = `Resultados para "${keyword}" — ${count} item(ns).`;
	resultsEl.innerHTML = '';

	if (!Array.isArray(products) || products.length === 0) {
		resultsEl.innerHTML = `<div class="error">Nenhum resultado encontrado.</div>`;
		return;
	}

	for (const p of products) {
		const card = document.createElement('article');
		card.className = 'card';

		const thumb = document.createElement('div');
		thumb.className = 'thumb';

		// fallback quando não houver imagem
		if (p.image && p.image !== 'No image') {
			const img = document.createElement('img');
			img.src = p.image;
			img.alt = p.title || 'Produto';
			img.referrerPolicy = 'no-referrer';

            img.loading = 'lazy';
img.decoding = 'async';

			thumb.appendChild(img);
		} else {
			thumb.innerHTML = '<span class="badge">Sem imagem</span>';
		}

		const body = document.createElement('div');
		body.className = 'card-body';

		const title = document.createElement('div');
		title.className = 'title';
		title.textContent = p.title || 'Sem título';

		const meta = document.createElement('div');
		meta.className = 'meta';
		const rating = document.createElement('span');
		rating.className = 'badge';
		rating.textContent = p.rating || 'No rating';
		const review = document.createElement('span');
		review.textContent = p.review || 'No reviews';

		meta.append(rating, review);
		body.append(title, meta);

		card.append(thumb, body);
		resultsEl.appendChild(card);
	}
}

function renderError(message) {
	resultsEl.innerHTML = '';
	statusEl.innerHTML = `<div class="error">Erro: ${message}</div>`;
}

async function search(keyword) {
	if (!keyword.trim()) {
		renderError('Informe uma palavra-chave.');
		return;
	}

	// cancela requisição anterior se ainda estiver rolando
	if (currentAbort) currentAbort.abort();
	currentAbort = new AbortController();

	try {
		setLoading(true);

		// Se estiver usando o proxy no Vite, basta usar /api/scrape
		const url = `/api/scrape?keyword=${encodeURIComponent(keyword)}&retries=2`;
		const res = await fetch(url, {
			signal: currentAbort.signal,
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(text || `HTTP ${res.status}`);
		}

		const data = await res.json();
		renderProducts(data);
	} catch (err) {
		if (err?.name === 'AbortError') return; // ignorar aborts
		renderError(err?.message || 'Falha ao buscar resultados.');
	} finally {
		setLoading(false);
		currentAbort = null;
	}
}

form.addEventListener('submit', (e) => {
	e.preventDefault();
	search(input.value);
});

// Enter no input também busca
input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') {
		e.preventDefault();
		form.requestSubmit();
	}
});

// foco inicial no input
input.focus();
