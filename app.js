document.addEventListener('DOMContentLoaded', async () => {
    const { supabaseClient: supabase } = window;
    let photos = []; // Local cache
    let editingId = null;

    function logError(msg) {
        const consoleEl = document.getElementById('debug-console');
        consoleEl.style.display = 'block';
        consoleEl.innerText += 'ERROR: ' + msg + '\n';
        console.error(msg);
    }
    window.logError = logError;

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

    // Lightbox Elements
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    // Event Listeners
    addPhotoBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Lightbox Listeners
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === lightboxOverlay) closeLightbox();
    });

    // Initial Load
    try {
        await fetchPhotos();
    } catch (e) {
        logError('Error inicializando: ' + e.message);
    }

    photoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Indicators
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        submitBtn.disabled = true;

        const title = document.getElementById('photo-title').value;
        const comment = document.getElementById('photo-comment').value;
        const dateValue = photoDate.value || new Date().toISOString().split('T')[0];
        const file = photoFile.files[0];

        try {
            if (editingId) {
                // UPDATE FLOW
                let updateData = { title, comment, date: dateValue };

                if (file) {
                    // 1. Upload new image
                    const { imageUrl, storagePath } = await uploadImage(file);
                    updateData.url = imageUrl;
                    updateData.storage_path = storagePath;

                    // 2. Delete old image (optional but good practice)
                    const oldPhoto = photos.find(p => p.id === editingId);
                    if (oldPhoto && oldPhoto.storage_path) {
                        await supabase.storage.from('lumina-bucket').remove([oldPhoto.storage_path]);
                    }
                }

                const { error } = await supabase.from('photos').update(updateData).eq('id', editingId);
                if (error) throw error;

            } else {
                // CREATE FLOW
                if (!file) {
                    alert('Por favor selecciona una foto');
                    resetBtn(originalBtnText);
                    return;
                }

                // 1. Upload Image
                const { imageUrl, storagePath } = await uploadImage(file);

                // 2. Insert to DB
                const { error } = await supabase.from('photos').insert({
                    title,
                    comment,
                    date: dateValue,
                    url: imageUrl,
                    storage_path: storagePath
                });

                if (error) throw error;
            }

            // Success
            await fetchPhotos(); // Refresh grid
            closeModal();
            resetBtn(originalBtnText);

        } catch (err) {
            console.error(err);
            logError('Error guardando: ' + (err.message || JSON.stringify(err)));
            alert('Error al guardar: ' + err.message);
            resetBtn(originalBtnText);
        }
    });

    function resetBtn(text) {
        submitBtn.textContent = text;
        submitBtn.disabled = false;
    }

    // --- Core Functions ---

    async function fetchPhotos() {
        // Get photos from Supabase, newest first
        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            logError('Error cargando fotos: ' + JSON.stringify(error));
            console.error('Error fetching photos:', error);
            return;
        }

        photos = data || [];
        renderGallery();
    }

    async function uploadImage(file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to 'lumina-bucket'
        const { error: uploadError } = await supabase.storage
            .from('lumina-bucket')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data } = supabase.storage
            .from('lumina-bucket')
            .getPublicUrl(filePath);

        return {
            imageUrl: data.publicUrl,
            storagePath: filePath
        };
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
                    <img src="${photo.url}" alt="${photo.title}" class="card-image" onclick="openLightbox('${photo.url}')" onerror="this.src='https://via.placeholder.com/400x300?text=Error+Loading'">
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
            if (photo.date) photoDate.value = photo.date;
        } else {
            editingId = null;
            modalTitle.textContent = 'Nuevo Recuerdo';
            submitBtn.textContent = 'Guardar Foto';
            photoForm.reset();
            photoDate.valueAsDate = new Date();
        }
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        photoForm.reset();
        editingId = null;
    }

    function openLightbox(url) {
        lightboxImg.src = url;
        lightboxOverlay.classList.remove('hidden');
        setTimeout(() => lightboxOverlay.classList.add('active'), 10);
    }

    function closeLightbox() {
        lightboxOverlay.classList.remove('active');
        setTimeout(() => {
            lightboxOverlay.classList.add('hidden');
            lightboxImg.src = '';
        }, 300);
    }

    // --- Global Exports ---

    window.removePhoto = async (id) => {
        if (!confirm('¿Seguro que quieres borrar este recuerdo de la nube?')) return;

        try {
            const photoToDelete = photos.find(p => p.id === id);

            // 1. Delete from DB
            const { error } = await supabase.from('photos').delete().eq('id', id);
            if (error) throw error;

            // 2. Delete file from Storage (if path exists)
            if (photoToDelete && photoToDelete.storage_path) {
                await supabase.storage.from('lumina-bucket').remove([photoToDelete.storage_path]);
            }

            await fetchPhotos();

        } catch (err) {
            alert('Error al borrar: ' + err.message);
        }
    };

    window.editPhoto = (id) => {
        const photo = photos.find(p => p.id === id);
        if (photo) openModal(photo);
    };

    window.openLightbox = openLightbox;
});
