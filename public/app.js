const API_URL = '/api/vehicles';
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

let data = { vehicles: [] };

const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const statusLabel = status => ({ available: 'Available', rented: 'Rented', service: 'In service' }[status] || status);

function showToast(message) {
  $('#toastMessage').textContent = message;
  $('#toast').classList.add('show');
  setTimeout(() => $('#toast').classList.remove('show'), 2600);
}

async function fetchVehicles() {
  try {
    const response = await fetch(API_URL);
    data.vehicles = await response.json();
    renderFleet();
    renderMetrics();
    $('#fleetCount').textContent = data.vehicles.length;
    $('#allFleetCount').textContent = data.vehicles.length;
  } catch (error) {
    console.error('Failed to fetch vehicles:', error);
    showToast('Failed to load vehicles from server.');
  }
}

function renderMetrics() {
  $('#attentionMetric').textContent = data.vehicles.filter(v => v.status === 'service').length;
}

function renderFleet() {
  const term = ($('#fleetSearch')?.value || '').toLowerCase();
  const filter = $('.filter-button.active[data-fleet-filter]')?.dataset.fleetFilter || 'all';
  const list = data.vehicles.filter(v =>
    (filter === 'all' || v.status === filter) &&
    Object.values(v).join(' ').toLowerCase().includes(term)
  );

  $('#fleetGrid').innerHTML = list.length
    ? list.map(v => `
      <article class="fleet-card">
        <div class="car-photo">
          <img src="${v.image}" alt="${esc(v.make + ' ' + v.model)}" />
          <span class="status ${v.status === 'rented' ? 'active' : ''} ${v.status === 'service' ? 'completed' : ''}">${statusLabel(v.status)}</span>
        </div>
        <div class="car-info">
          <h3>${esc(v.make)} ${esc(v.model)}</h3>
          <p>${esc(v.year)} · ${esc(v.type)} · ${esc(v.id)}</p>
          <div class="car-meta">
            <span>Daily rate <span class="car-price"><strong>$${esc(v.price)}</strong> / day</span></span>
            <span>● ${esc(v.color)}</span>
          </div>
          <div class="card-actions">
            <button class="small-button" data-edit="vehicle" data-id="${v.id}">Edit vehicle</button>
            <button class="small-button delete" data-delete="vehicle" data-id="${v.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join('')
    : `<div class="empty-state">No vehicles match your search.</div>`;
}

async function addVehicle(values) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add vehicle');
    }
    await fetchVehicles();
    showToast('Vehicle added successfully');
  } catch (error) {
    console.error(error);
    showToast(error.message);
  }
}

async function updateVehicle(id, values) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update vehicle');
    }
    await fetchVehicles();
    showToast('Vehicle updated successfully');
  } catch (error) {
    console.error(error);
    showToast(error.message);
  }
}

async function deleteVehicle(id) {
  if (!confirm('Delete this vehicle? This action cannot be undone.')) return;
  try {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete vehicle');
    await fetchVehicles();
    showToast('Vehicle deleted');
  } catch (error) {
    console.error(error);
    showToast(error.message);
  }
}

let modalType = '', editingId = null;

function formFields(type, item = {}) {
  const vehicleFields = `
    <div class="form-field"><label>Make</label><input name="make" value="${esc(item.make)}" required></div>
    <div class="form-field"><label>Model</label><input name="model" value="${esc(item.model)}" required></div>
    <div class="form-field"><label>Year</label><input name="year" type="number" value="${esc(item.year || 2024)}" required></div>
    <div class="form-field"><label>Type</label><select name="type">
      <option>Economy</option><option>Compact SUV</option><option>Premium</option><option>Electric</option><option>SUV</option>
    </select></div>
    <div class="form-field"><label>Daily rate ($)</label><input name="price" type="number" value="${esc(item.price || 50)}" required></div>
    <div class="form-field"><label>Status</label><select name="status">
      <option value="available">Available</option><option value="rented">Rented</option><option value="service">In service</option>
    </select></div>
    <div class="form-field full"><label>Image URL (optional)</label><input name="image" value="${esc(item.image || '')}" placeholder="https://..."></div>
  `;
  return `
    <div class="form-grid">${vehicleFields}</div>
    <div class="form-actions">
      <button type="button" class="small-button" id="cancelModal">Cancel</button>
      <button class="primary-button" type="submit">Save ${type}</button>
    </div>
  `;
}

function openModal(type, id = null) {
  modalType = type;
  editingId = id;
  const item = id ? data.vehicles.find(v => v.id === id) : {};
  $('#modalEyebrow').textContent = id ? 'Edit record' : 'Add record';
  $('#modalTitle').textContent = `${id ? 'Edit' : 'New'} ${type}`;
  $('#modalSubtitle').textContent = id ? 'Update the details below and save your changes.' : 'Add the details below to keep your records up to date.';
  $('#recordForm').innerHTML = formFields(type, item);
  $('#recordForm').querySelectorAll('select').forEach(select => {
    if (item[select.name]) select.value = item[select.name];
  });
  $('#modalBackdrop').classList.remove('hidden');
  $('#recordForm input')?.focus();
}

function closeModal() {
  $('#modalBackdrop').classList.add('hidden');
}

async function submitForm(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.target));

  if (editingId) {
    await updateVehicle(editingId, values);
  } else {
    await addVehicle(values);
  }

  closeModal();
}

document.addEventListener('click', event => {
  const pageLink = event.target.closest('[data-page-link]');
  if (pageLink) {
    event.preventDefault();
    const target = pageLink.dataset.pageLink;
    const valid = ['dashboard', 'fleet', 'bookings', 'customers'];
    if (valid.includes(target)) {
      valid.forEach(name => $('#' + name + 'Page').classList.toggle('hidden', name !== target));
      $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === target));
      $('#breadcrumbPage').textContent = target[0].toUpperCase() + target.slice(1);
      history.replaceState(null, '', '#' + target);
    }
    return;
  }

  const open = event.target.closest('[data-open-modal]');
  if (open) {
    openModal(open.dataset.openModal);
    return;
  }

  const edit = event.target.closest('[data-edit]');
  if (edit) {
    openModal(edit.dataset.edit, edit.dataset.id);
    return;
  }

  const del = event.target.closest('[data-delete]');
  if (del) {
    deleteVehicle(del.dataset.id);
    return;
  }

  if (event.target.closest('#closeModal') || event.target.closest('#cancelModal') || event.target === $('#modalBackdrop')) {
    closeModal();
  }

  const fleetFilter = event.target.closest('[data-fleet-filter]');
  if (fleetFilter) {
    $$('[data-fleet-filter]').forEach(btn => btn.classList.remove('active'));
    fleetFilter.classList.add('active');
    renderFleet();
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'fleetSearch') renderFleet();
});

document.addEventListener('submit', submitForm);
window.addEventListener('hashchange', () => {
  const target = location.hash.slice(1) || 'dashboard';
  const valid = ['dashboard', 'fleet', 'bookings', 'customers'];
  if (valid.includes(target)) {
    valid.forEach(name => $('#' + name + 'Page').classList.toggle('hidden', name !== target));
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === target));
    $('#breadcrumbPage').textContent = target[0].toUpperCase() + target.slice(1);
  }
});

fetchVehicles();