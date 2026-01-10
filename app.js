document.addEventListener('DOMContentLoaded', () => {
    // State
    let photos = JSON.parse(localStorage.getItem('lumina_photos')) || [];

    // Elements
    const galleryGrid = document.getElementById('gallery-grid');
    const emptyState = document.getElementById('empty-state');
    const addPhotoBtn = document.getElementById('add-photo-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const closeModalBtn = document.getElementById('close-modal');
    const photoForm = document.getElementById('photo-form');

    const photoFile = document.getElementById('photo-file');
    const photoDate = document.getElementById('photo-date');
    const modalTitle = document.querySelector('.modal-header h2');
    const submitBtn = document.querySelector('#photo-form button[type="submit"]');

    let editingId = null;

    // Initial Render
    renderGallery();

    // Event Listeners
    addPhotoBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    photoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('photo-title').value;
        const comment = document.getElementById('photo-comment').value;
        const dateValue = photoDate.value;
        let finalUrl = '';

        // If file selected, use it. 
        const file = photoFile.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                if (!confirm('La imagen es grande. ¿Continuar?')) return;
            }
            finalUrl = await toBase64(file);
        } else if (editingId) {
            // Keep existing URL if no new file
            const existing = photos.find(p => p.id === editingId);
            finalUrl = existing.url;
        } else {
            alert('Por favor selecciona una foto');
            return;
        }

        if (editingId) {
            // Update
            photos = photos.map(p => {
                if (p.id === editingId) {
                    return { ...p, title, comment, url: finalUrl, date: dateValue };
                }
                return p;
            });
        } else {
            // Create
            const newPhoto = {
                id: Date.now(),
                title,
                url: finalUrl,
                comment,
                date: dateValue || new Date().toISOString().split('T')[0] // Default to today if empty (though required)
            };
            photos.unshift(newPhoto);
        }

        try {
            savePhotos();
            renderGallery();
            closeModal();
        } catch (err) {
            alert('Error al guardar. Es posible que el almacenamiento local esté lleno.');
            console.error(err);
        }
    });

    // Functions
    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    function savePhotos() {
        localStorage.setItem('lumina_photos', JSON.stringify(photos));
    }

    function renderGallery() {
        galleryGrid.innerHTML = '';

        if (photos.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        photos.forEach(photo => {
            const card = document.createElement('div');
            card.className = 'photo-card';

            // Format date for display
            const displayDate = photo.date ? new Date(photo.date).toLocaleDateString() : '';

            card.innerHTML = `
                <div class="card-actions">
                    <button type="button" class="edit-btn" onclick="editPhoto(${photo.id})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" class="delete-btn" onclick="removePhoto(${photo.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div class="card-image-container">
                    <img src="${photo.url}" alt="${photo.title}" class="card-image" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                </div>
                <div class="card-content">
                    <div class="card-header-line">
                        <h3 class="card-title">${photo.title}</h3>
                        <span class="card-date">${displayDate}</span>
                    </div>
                    <p class="card-comment">${photo.comment}</p>
                </div>
            `;

            galleryGrid.appendChild(card);
        });
    }

    function openModal(photo = null) {
        modalOverlay.classList.remove('hidden');
        if (photo) {
            editingId = photo.id;
            modalTitle.textContent = 'Editar Recuerdo';
            submitBtn.textContent = 'Actualizar Foto';
            document.getElementById('photo-title').value = photo.title;
            document.getElementById('photo-comment').value = photo.comment;

            // Handle date
            if (photo.date) {
                // Should be YYYY-MM-DD
                photoDate.value = photo.date;
            } else {
                photoDate.valueAsDate = new Date();
            }

        } else {
            editingId = null;
            modalTitle.textContent = 'Nuevo Recuerdo';
            submitBtn.textContent = 'Guardar Foto';
            photoForm.reset();
            photoDate.valueAsDate = new Date(); // Default to today
        }
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        photoForm.reset();
        editingId = null;
    }

    // Expose functions globally
    window.removePhoto = (id) => {
        if (confirm('¿Seguro que quieres borrar este recuerdo?')) {
            photos = photos.filter(p => p.id !== id);
            savePhotos();
            renderGallery();
        }
    };

    window.editPhoto = (id) => {
        const photo = photos.find(p => p.id === id);
        if (photo) openModal(photo);
    };
});
