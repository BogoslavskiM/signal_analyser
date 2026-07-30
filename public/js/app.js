const settings = [
  { name: 'param1', value: '1000000', unit: 'Hz', error: '' },
  { name: 'param2', value: '', unit: 'ms', error: 'Значение не может быть пустым' },
  { name: 'param3', value: '0.000000001', unit: '', error: 'Значение должно быть целым числом' },
  { name: 'param4', value: '42', unit: 'dB', error: '' },
  { name: 'param5', value: '3.14', unit: '', error: '' },
];

function renderSettings() {
  const list = document.getElementById('settings-list');

  list.innerHTML = settings.map((setting, index) => `
    <div class="settings-field-row">
      <span class="settings-label settings-field-label" title="${setting.name}${setting.unit ? ` ${setting.unit}` : ''}">
        <span class="settings-label-text">${setting.name}</span>
        ${setting.unit ? `<span class="settings-unit-inline">${setting.unit}</span>` : ''}
      </span>
      <div class="settings-form-control-with-error${setting.error ? ' has-error' : ''}">
        <input
          class="settings-form-field"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          value="${setting.value}"
          aria-invalid="${setting.error ? 'true' : 'false'}"
          data-index="${index}"
        >
        ${setting.error ? `<span data-tooltip="${setting.error}" aria-label="${setting.error}" tabindex="0" class="settings-field-error-icon"></span>` : ''}
        ${setting.error ? `<p class="settings-inline-error">${setting.error}</p>` : ''}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.settings-form-field').forEach((input) => {
    input.addEventListener('input', (event) => {
      settings[Number(event.target.dataset.index)].value = event.target.value;
    });
  });
}

renderSettings();
