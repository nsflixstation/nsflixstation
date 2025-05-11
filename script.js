const API_KEY = 'ba599f5ce297ac5336a9b27a9cf2d7aa'; // Replace with your TMDb API Key
const API_READ_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYTU5OWY1Y2UyOTdhYzUzMzZhOWIyN2E5Y2YyZDdhYSIsIm5iZiI6MTY3NzgyNzYwNC42NjgsInN1YiI6IjY0MDE5ZTE0N2E0ZWU3MDBiOTE4NTA1NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.G7K8ztpXQRtZGA6Y92l7wXR0rSCx3lbKzMtf9XkoAQA'; // Replace with your TMDb API Read Access Token

const data = []; // Dynamically populated

const container = document.querySelector('.container');
const searchInput = document.querySelector('.search-bar input');
const searchButton = document.querySelector('.search-bar button');
const clearSearchBtn = document.getElementById('clear-search-btn');
const popupOverlay = document.querySelector('.popup-overlay');
const popupContent = document.querySelector('.popup-content');
const popupCloseButton = document.querySelector('.popup-close');

let currentPage = 1; // Track the current page for pagination
const resultsPerPage = 25; // Number of results per page updated to 25

let selectedContentType = 'ALL'; // ALL, Movie, TV Show

// Content type popup logic
const contentTypeBtn = document.getElementById('content-type-btn');
const contentTypePopup = document.getElementById('content-type-popup');
const contentTypeSelect = document.getElementById('content-type-select');
const contentTypeApply = document.getElementById('content-type-apply');

// Collections logic
const collectionsBtn = document.getElementById('collections-btn');
const collectionsPopup = document.getElementById('collections-popup');
const collectionsList = document.getElementById('collections-list');
const collectionsClose = document.getElementById('collections-close');
const collectionsResetBtn = document.getElementById('collection-reset-btn');

const selectedCollectionHeadline = document.getElementById('selected-collection-headline');
const selectedCollectionTitle = document.getElementById('selected-collection-title');

let collectionsData = {}; // { collectionId: { id, name, backdrop, items: [dataItem, ...] } }
let currentCollectionId = null;

// Show popup on button click
contentTypeBtn.addEventListener('click', () => {
    clearCollectionFilter();
    contentTypeSelect.value = selectedContentType;
    contentTypePopup.style.display = 'block';
});

// Hide popup and apply filter
contentTypeApply.addEventListener('click', () => {
    selectedContentType = contentTypeSelect.value;
    contentTypeBtn.textContent = selectedContentType === 'ALL' ? 'ALL' : (selectedContentType === 'Movie' ? 'Movies' : 'TV Shows');
    contentTypePopup.style.display = 'none';
    renderCards();
});

// Hide popup on outside click
window.addEventListener('mousedown', (e) => {
    if (contentTypePopup.style.display === 'block' && !contentTypePopup.contains(e.target) && e.target !== contentTypeBtn) {
        contentTypePopup.style.display = 'none';
    }
    if (
        collectionsPopup.style.display === 'block' &&
        !collectionsPopup.contains(e.target) &&
        e.target !== collectionsBtn
    ) {
        collectionsPopup.style.display = 'none';
    }
});

// Fetch TMDb collection info for a TMDb movie id
async function fetchCollectionInfo(tmdbId) {
    // Get movie details to find collection
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${API_READ_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    const movie = await response.json();
    if (movie.belongs_to_collection) {
        const col = movie.belongs_to_collection;
        return {
            id: col.id,
            name: col.name,
            backdrop: col.backdrop_path
                ? `https://image.tmdb.org/t/p/w780${col.backdrop_path}`
                : '',
        };
    }
    return null;
}

// Updated fetchLatestCollectionInfo to include the collection poster from TMDb
async function fetchLatestCollectionInfo(collectionId) {
    const url = `https://api.themoviedb.org/3/collection/${collectionId}?api_key=${API_KEY}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${API_READ_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    const col = await response.json();
    return {
        id: col.id,
        name: col.name,
        backdrop: col.backdrop_path
            ? `https://image.tmdb.org/t/p/original${col.backdrop_path}`
            : '',
        poster: col.poster_path
            ? `https://image.tmdb.org/t/p/w500${col.poster_path}`
            : '', // now use the collection's poster image
    };
}

// Fetch movie/TV show data from TMDb
async function fetchTmdbData(imdbId) {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${API_KEY}&external_source=imdb_id`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${API_READ_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    const result = await response.json();
    const movie = result.movie_results[0] || result.tv_results[0];
    if (!movie) throw new Error('No data found for the given IMDb ID.');

    // Fetch genres for proper category names
    let genresUrl, genresData;
    if (result.movie_results[0]) {
        genresUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}`;
    } else {
        genresUrl = `https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}`;
    }
    const genresResponse = await fetch(genresUrl);
    genresData = await genresResponse.json();
    const genresMap = genresData.genres.reduce((map, genre) => {
        map[genre.id] = genre.name;
        return map;
    }, {});

    const categories = (movie.genre_ids || []).map(id => genresMap[id]).join(', ');

    let backdropPath = movie.backdrop_path 
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : (movie.poster_path 
            ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
            : '');

    // Always set media_type for later use
    let type = movie.media_type;
    if (!type) {
        type = result.movie_results[0] ? 'movie' : 'tv';
    }

    return {
        title: movie.title || movie.name,
        poster: `https://image.tmdb.org/t/p/w600_and_h900_bestv2${movie.poster_path}`,
        backdrop: backdropPath,
        type: type === 'movie' ? 'Movie' : 'TV Show',
        releaseDate: new Date(movie.release_date || movie.first_air_date).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }),
        categories,
        imdbId: imdbId,
        tmdbId: movie.id,
    };
}

// After all content is loaded, build collectionsData
async function buildCollections() {
    collectionsData = {};
    for (const item of data) {
        // Only movies with valid tmdbId
        if (item.type !== 'Movie' || !item.tmdbId) continue;
        const colInfo = await fetchCollectionInfo(item.tmdbId);
        if (colInfo) {
            if (!collectionsData[colInfo.id]) {
                collectionsData[colInfo.id] = {
                    id: colInfo.id,
                    name: colInfo.name,
                    backdrop: colInfo.backdrop,
                    items: [],
                };
            }
            // Prevent duplicates
            if (!collectionsData[colInfo.id].items.some(i => i.imdbId === item.imdbId)) {
                collectionsData[colInfo.id].items.push(item);
            }
        }
    }
}

// Updated showCollectionsPopup to use the collection's poster instead of a movie poster
async function showCollectionsPopup() {
    collectionsList.innerHTML = '';
    const colArr = Object.values(collectionsData);
    const latestCols = await Promise.all(colArr.map(async col => {
        const latest = await fetchLatestCollectionInfo(col.id);
        return {
            ...col,
            name: latest.name || col.name,
            backdrop: latest.backdrop || col.backdrop || (col.items.length > 0 ? col.items[0].backdrop : ''),
            poster: latest.poster || col.poster,
        };
    }));
    latestCols.forEach(col => {
        const div = document.createElement('div');
        div.className = 'collection-item';
        div.innerHTML = `
            <img class="collection-backdrop" src="${col.backdrop || ''}" alt="">
            <img class="collection-poster" src="${col.poster || ''}" alt="">
            <div class="collection-info">
                <div class="collection-title">${col.name}</div>
            </div>
            <div class="collection-count">${col.items.length}</div>
        `;
        div.addEventListener('click', () => {
            currentCollectionId = col.id;
            collectionsPopup.style.display = 'none';
            renderCards(col.items);
            collectionsResetBtn.style.display = 'inline-block';
            // Show headline and hide content-type button
            selectedCollectionHeadline.style.display = 'flex';
            selectedCollectionTitle.textContent = col.name;
            document.body.classList.add('hide-content-type-btn');
        });
        collectionsList.appendChild(div);
    });
    collectionsPopup.style.display = 'block';
}

// Reset button clears the collection filter 
collectionsResetBtn.addEventListener('click', () => {
    clearCollectionFilter();
    renderCards();
    collectionsResetBtn.style.display = 'none';
    selectedCollectionHeadline.style.display = 'none';
    selectedCollectionTitle.textContent = '';
    document.body.classList.remove('hide-content-type-btn');
});

// Close collections popup
collectionsClose.addEventListener('click', () => {
    collectionsPopup.style.display = 'none';
});

// Show collections popup on button click
collectionsBtn.addEventListener('click', () => {
    showCollectionsPopup();
});

// Copy IMDb ID to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert(`Copied to clipboard: ${text}`);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Render cards dynamically with pagination
function renderCards(filteredData = data) {
    // Clear existing cards to avoid duplication
    container.innerHTML = ''; // Clear existing cards

    // Filter by content type if not ALL
    let filtered = filteredData;
    if (selectedContentType !== 'ALL') {
        filtered = filtered.filter(item => item.type === selectedContentType);
    }

    if (currentCollectionId) {
        // Only show items in the current collection
        const col = collectionsData[currentCollectionId];
        if (col) filtered = col.items.filter(item => filtered.includes(item));
    }

    // Sort the data by release date (latest first)
    filtered.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

    if (filtered.length === 0) {
        // Display a message when no results are found
        const noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-results';
        noResultsMessage.textContent = 'The thing you searched is not available on our server.';
        container.appendChild(noResultsMessage);
        document.getElementById('load-more').style.display = 'none'; // Hide "Load More" button
        return; // Exit early to avoid further rendering
    }

    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = currentPage * resultsPerPage;
    const paginatedData = filtered.slice(0, endIndex);

    paginatedData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';

        const imdbBadge = document.createElement('div');
        imdbBadge.className = 'imdb-badge';
        imdbBadge.textContent = item.imdbId;
        imdbBadge.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent triggering the card click event
            copyToClipboard(item.imdbId); // Copy IMDb ID to clipboard
        });

        const img = document.createElement('img');
        img.src = item.poster;
        img.alt = item.title;

        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.textContent = item.type;

        const title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = item.title;

        const separator = document.createElement('div');
        separator.className = 'card-separator';

        const releaseDate = document.createElement('div');
        releaseDate.className = 'card-release-date';
        releaseDate.textContent = item.releaseDate;

        card.appendChild(imdbBadge);
        card.appendChild(img);
        card.appendChild(badge);
        card.appendChild(title);
        card.appendChild(separator);
        card.appendChild(releaseDate);

        // Add click event to show popup
        card.addEventListener('click', () => showPopup(item));

        container.appendChild(card);
    });

    // Show or hide the "Load More" button
    const loadMoreButton = document.getElementById('load-more');
    if (filtered.length > endIndex) {
        loadMoreButton.style.display = 'block';
    } else {
        loadMoreButton.style.display = 'none';
    }
}

// Show popup with movie/TV show details
function showPopup(item) {
    // Use a default background if item.backdrop is missing or empty
    let bgImage = item.backdrop && item.backdrop.trim() !== ''
        ? `url(${item.backdrop})`
        : 'none'; // fallback: you can use a default image URL here if you want

    popupContent.style.backgroundImage = bgImage;
    popupContent.style.backgroundSize = 'cover';
    popupContent.style.backgroundPosition = 'center';
    popupContent.style.backgroundRepeat = 'no-repeat';

    popupContent.innerHTML = `
        <div class="popup-inner">
            <div class="dropdown">
                <label for="watch-server">Watch Online:</label>
                <select id="watch-server">
                    <option value="server1">Server 1</option>
                    <option value="server2">Server 2</option>
                    <option value="server3">Server 3</option>
                </select>
                <button onclick="openPlayerPopup('${item.imdbId}', '${item.type}')">PLAY</button>
                <button 
                    onclick="redirectToServer('${item.imdbId}', '${item.type}')"
                    style="display: none; pointer-events: none;"
                >GO</button>
            </div>
            <div class="popup-body">
                <img src="${item.poster}" alt="${item.title}" class="popup-poster">
                <div class="popup-details">
                    <h2>${item.title}</h2>
                    <p><strong>Type:</strong> ${item.type}</p>
                    <p><strong>Release Date:</strong> ${item.releaseDate}</p>
                    <p><strong>Categories:</strong> ${item.categories}</p>
                    <p><strong>IMDb ID:</strong> ${item.imdbId}</p>
                    <p><strong>TMDb ID:</strong> ${item.tmdbId}</p>
                </div>
            </div>
        </div>
    `;
    popupContent.scrollTop = 0; // Reset scroll position to the top
    popupOverlay.style.display = 'flex';
    document.body.classList.add('popup-open'); // Disable background scrolling
}

// Open a new popup for the player
function openPlayerPopup(imdbId, type) {
    const server = document.getElementById('watch-server').value;
    let embedUrl = '';

    if (server === 'server1') {
        embedUrl = type === 'Movie'
            ? `https://vidsrc.xyz/embed/movie/${imdbId}`
            : `https://vidsrc.xyz/embed/tv/${imdbId}`;
    } else if (server === 'server2') {
        embedUrl = type === 'Movie'
            ? `https://vidsrc.to/embed/movie/${imdbId}`
            : `https://vidsrc.to/embed/tv/${imdbId}`;
    } else if (server === 'server3') {
        if (type === 'Movie') {
            embedUrl = `https://www.2embed.cc/embed/${imdbId}`;
        } else {
            alert('Server 3 is only available for movies. TV shows are not supported on the selected server please choose another server and TRY AGAIN.');
            return;
        }
    }

    if (embedUrl) {
        const playerPopup = document.createElement('div');
        playerPopup.className = 'player-popup-overlay';
        playerPopup.innerHTML = `
            <div class="player-popup-content">
                <button class="player-popup-close" onclick="closePlayerPopup()">X</button>
                <iframe src="${embedUrl}" frameborder="0" allowfullscreen class="player-frame"></iframe>
            </div>
        `;
        document.body.appendChild(playerPopup);
        document.body.classList.add('popup-open'); // Disable background scrolling
    } else if (server !== 'server3') {
        alert('Unable to load the player. Please try again.');
    }
}

// Close the player popup
function closePlayerPopup() {
    const playerPopup = document.querySelector('.player-popup-overlay');
    if (playerPopup) {
        playerPopup.remove();
        document.body.classList.remove('popup-open'); // Re-enable background scrolling
    }
}

// Redirect to the selected server
function redirectToServer(imdbId, type) {
    const server = document.getElementById('watch-server').value;
    let url = '';
    if (server === 'server1') {
        url = type === 'Movie'
            ? `https://vidsrc.xyz/embed/movie/${imdbId}`
            : `https://vidsrc.xyz/embed/tv/${imdbId}`;
    } else if (server === 'server2') {
        url = type === 'Movie'
            ? `https://vidsrc.to/embed/movie/${imdbId}`
            : `https://vidsrc.to/embed/tv/${imdbId}`;
    } else if (server === 'server3') {
        if (type === 'Movie') {
            url = `https://www.2embed.cc/embed/${imdbId}`;
        } else {
            alert('Server 3 is only available for movies. TV shows are not supported on Server 3.');
            return;
        }
    }
    if (url) {
        window.open(url, '_blank');
    }
}

// Close popup
popupCloseButton.addEventListener('click', () => {
    popupOverlay.style.display = 'none';
    popupContent.innerHTML = ''; // Clear popup content when closed
    popupContent.scrollTop = 0; // Reset scroll position to the top
    document.body.classList.remove('popup-open'); // Re-enable background scrolling
});

// Close popup when clicking outside
popupOverlay.addEventListener('click', (event) => {
    if (event.target === popupOverlay) {
        popupOverlay.style.display = 'none';
        popupContent.innerHTML = ''; // Clear popup content
        popupContent.scrollTop = 0; // Reset scroll position to the top
        document.body.classList.remove('popup-open'); // Re-enable background scrolling
    }
});

// Add movie/TV show by IMDb ID
async function addContentByImdbId(imdbId) {
    try {
        const item = await fetchTmdbData(imdbId);
        data.push(item);
        renderCards(); // Ensure the cards are rendered after adding content
    } catch (error) {
        console.error(`Error adding content for IMDb ID "${imdbId}":`, error.message);
        
    }
}

// Handle search input functionality
searchInput.addEventListener('input', () => {
    let filtered = data.filter(item => {
        return (
            item.title.toLowerCase().includes(searchInput.value.toLowerCase()) ||
            item.type.toLowerCase().includes(searchInput.value.toLowerCase()) ||
            item.categories.toLowerCase().includes(searchInput.value.toLowerCase()) ||
            item.imdbId.toLowerCase().includes(searchInput.value.toLowerCase()) ||
            item.releaseDate.toLowerCase().includes(searchInput.value.toLowerCase())
        );
    });
    // Filter by content type if not ALL
    if (selectedContentType !== 'ALL') {
        filtered = filtered.filter(item => item.type === selectedContentType);
    }
    renderCards(filtered);
});

// Add a way to clear collection filter (reset to all)
function clearCollectionFilter() {
    currentCollectionId = null;
    selectedCollectionHeadline.style.display = 'none';
    selectedCollectionTitle.textContent = '';
    document.body.classList.remove('hide-content-type-btn');
    renderCards();
}

// Also clear collection filter when clearing search
if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        clearCollectionFilter();
        searchInput.value = '';
        renderCards();
    });
}

// Load more content
function loadMoreContent() {
    currentPage++;
    renderCards(); // Show the next set of results
}

// Add event listener to the "Load More" button
document.getElementById('load-more').addEventListener('click', loadMoreContent);

// Add content for the IMDb IDs provided by the user
(async function initializeContent() {
    const imdbIds = [
        'tt18259086', 'tt3566834', 'tt13196080', 'tt0877057', 'tt13706018', 'tt26684398', 'tt4574334', 'tt9389998', 'tt16539454', 'tt10698680', 'tt7838252', 'tt7766378', 'tt29603959', 'tt9150192', 'tt31314296', 'tt21267296', 'tt31434639', 'tt8178634', 'tt12735488', 'tt13927994', 'tt13751694', 'tt15327088', 'tt15654328', 'tt0944947', 'tt5180504', 'tt13443470', 'tt10919420', 'tt28104766', 'tt10048342', 'tt2531336', 'tt13696452', 'tt0903747', 'tt7767422', 'tt16288804', 'tt5753856', 'tt11198330', 'tt23849204', 'tt10189514', 'tt1187043', 'tt5074352', 'tt3417422', 'tt0052572', 'tt0066763', 'tt0109117', 'tt12392504', 'tt0257315', 'tt9432978', 'tt9544034', 'tt12004706', 'tt6077448', 'tt9398466', 'tt0387564', 'tt0432348', 'tt0489270', 'tt0890870', 'tt1132626', 'tt1233227', 'tt1477076', 'tt3348730', 'tt10342730', 'tt21807222', 'tt12412888', 'tt3794354', 'tt0048473', 'tt0048956', 'tt12361178', 'tt15501640', 'tt4430212', 'tt0145487', 'tt0316654', 'tt0413300', 'tt1877830', 'tt0371746', 'tt1228705', 'tt1300854', 'tt0848228', 'tt2395427', 'tt4154756', 'tt4154796', 'tt4154664', 'tt10676048', 'tt10954600', 'tt5095030', 'tt0478970', 'tt0800369', 'tt1981115', 'tt3501632', 'tt10648342'
    ];
    for (const imdbId of imdbIds) {
        await addContentByImdbId(imdbId);
    }
    await buildCollections();
    renderCards(); // Render cards after loading content
})();
