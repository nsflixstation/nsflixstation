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

// Show popup on button click
contentTypeBtn.addEventListener('click', () => {
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
});

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
    const genresResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}`);
    const genresData = await genresResponse.json();
    const genresMap = genresData.genres.reduce((map, genre) => {
        map[genre.id] = genre.name;
        return map;
    }, {});

    const categories = (movie.genre_ids || []).map(id => genresMap[id]).join(', ');

    // Fallback for backdrop: use poster if backdrop is missing, or empty string
    let backdropPath = movie.backdrop_path 
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : (movie.poster_path 
            ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
            : '');

    return {
        title: movie.title || movie.name,
        poster: `https://image.tmdb.org/t/p/w600_and_h900_bestv2${movie.poster_path}`,
        backdrop: backdropPath,
        type: movie.media_type === 'movie' ? 'Movie' : 'TV Show',
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
    // Filter by content type if not ALL
    let filtered = filteredData;
    if (selectedContentType !== 'ALL') {
        filtered = filtered.filter(item => item.type === selectedContentType);
    }

    // Sort the data by release date (latest first)
    filtered.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

    container.innerHTML = ''; // Clear existing cards

    if (filtered.length === 0) {
        // Display a message when no results are found
        const noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-results';
        noResultsMessage.textContent = 'The thing you searched is not available on our server.';
        container.appendChild(noResultsMessage);
        // Show or hide the "Load More" button
        const loadMoreButton = document.getElementById('load-more');
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

// Load more content
function loadMoreContent() {
    currentPage++;
    renderCards(); // Show the next set of results
}

// Add event listener to the "Load More" button
document.getElementById('load-more').addEventListener('click', loadMoreContent);

// Add content for the IMDb IDs provided by the user
(async function initializeContent() {
    const imdbIds = ['tt18259086', 'tt3566834', 'tt13196080', 'tt0877057', 'tt13706018', 'tt26684398', 'tt4574334', 'tt9389998', 'tt16539454', 'tt10698680', 'tt7838252', 'tt7766378', 'tt29603959', 'tt9150192', 'tt31314296', 'tt21267296', 'tt31434639', 'tt8178634', 'tt12735488', 'tt13927994', 'tt13751694', 'tt15327088', 'tt15654328', 'tt0944947', 'tt5180504', 'tt13443470', 'tt10919420', 'tt28104766', 'tt10048342', 'tt2531336', 'tt13696452', 'tt0903747', 'tt7767422', 'tt16288804', 'tt5753856', 'tt11198330', 'tt23849204', 'tt10189514', 'tt1187043', 'tt5074352', 'tt3417422', 'tt0052572', 'tt0066763', 'tt0109117', 'tt12392504', 'tt0257315', 'tt9432978', 'tt9544034', 'tt12004706', 'tt6077448', 'tt9398466'

]; // Replace with the IMDb IDs you want to add
    for (const imdbId of imdbIds) {
        await addContentByImdbId(imdbId);
    }
    renderCards(); // Render cards after loading content
})();
