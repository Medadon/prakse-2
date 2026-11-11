// Мобильное меню
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation.classList.toggle('open', !isOpen);
});

// Закрываем меню после выбора
navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
});

// Форма заявки и статус
const form = document.querySelector('#trip-form');
const formStatus = document.querySelector('.form-status');

// Отправка заявки на сервер
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formStatus.textContent = 'Pieteikums tiek nosūtīts…';
  formStatus.classList.remove('error');

  const request = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Neizdevās nosūtīt pieteikumu.');
    formStatus.textContent = 'Paldies! Pieteikums ir saglabāts. Drīz sazināsimies ar idejām.';
    form.reset();
  } catch (error) {
    formStatus.textContent = error.message || 'Neizdevās sazināties ar serveri. Mēģini vēlreiz.';
    formStatus.classList.add('error');
  }
});

// Карусель мест
const placeGrid = document.querySelector('.place-grid');
const placeCards = [...placeGrid.querySelectorAll('.place-card')];
const placeViewport = document.querySelector('.place-viewport');
let slideIndex = 0;

// Число видимых карточек
function visiblePlaceCount() {
  const gap = Number.parseFloat(getComputedStyle(placeGrid).columnGap) || 0;
  const step = placeCards[0].getBoundingClientRect().width + gap;
  return Math.max(1, Math.round(placeViewport.clientWidth / step));
}

// Положение карусели
function updatePlacesSlider() {
  const gap = Number.parseFloat(getComputedStyle(placeGrid).columnGap) || 0;
  const step = placeCards[0].getBoundingClientRect().width + gap;
  const lastIndex = Math.max(0, placeCards.length - visiblePlaceCount());
  slideIndex = Math.min(slideIndex, lastIndex);
  placeGrid.style.transform = `translateX(${-slideIndex * step}px)`;
}

// Предыдущий слайд
document.querySelector('.prev').addEventListener('click', () => {
  const lastIndex = Math.max(0, placeCards.length - visiblePlaceCount());
  slideIndex = slideIndex <= 0 ? lastIndex : slideIndex - 1;
  updatePlacesSlider();
});

// Следующий слайд
document.querySelector('.next').addEventListener('click', () => {
  const lastIndex = Math.max(0, placeCards.length - visiblePlaceCount());
  slideIndex = slideIndex >= lastIndex ? 0 : slideIndex + 1;
  updatePlacesSlider();
});

// Обновление при смене размера окна
window.addEventListener('resize', updatePlacesSlider);
updatePlacesSlider();

// Кнопки фактов
document.querySelectorAll('.fact-button').forEach((button) => {
  button.addEventListener('click', () => {
    const fact = document.getElementById(button.getAttribute('aria-controls'));
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isExpanded));
    fact.hidden = isExpanded;
    button.innerHTML = isExpanded ? 'Uzzināt faktu <span>+</span>' : 'Paslēpt faktu <span>−</span>';
  });
});

// Поля бюджета и элементы вывода
const travelersInput = document.querySelector('#travelers');
const daysInput = document.querySelector('#trip-days');
const nightsInput = document.querySelector('#trip-nights');
const stayCostInput = document.querySelector('#stay-cost');
const foodCostInput = document.querySelector('#food-cost');
const localTransportInput = document.querySelector('#local-transport-cost');
const serviceInputs = [...document.querySelectorAll('input[name="service"]')];
const totalOutput = document.querySelector('#estimate-total');
const estimateNote = document.querySelector('#estimate-note');
const breakdown = document.querySelector('#budget-breakdown');
const serviceNames = {
  guide: 'Pastaiga gida pavadībā',
  museum: 'Muzeja apmeklējums',
  boat: 'Izbrauciens ar kuģīti',
  transfer: 'Pilsētas transfērs',
};
// Форматирование цены
const formatMoney = (amount) => `${new Intl.NumberFormat('lv-LV', { maximumFractionDigits: 2 }).format(amount)} €`;

// Проверка числового ввода
function clampInput(input, min, max) {
  const value = Number.parseFloat(input.value);
  const safeValue = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  input.value = safeValue;
  return safeValue;
}

// Расчёт бюджета
function calculateTrip() {
  const travelers = clampInput(travelersInput, 1, 20);
  const days = clampInput(daysInput, 1, 30);
  const nights = clampInput(nightsInput, 0, 30);
  const stayPerRoom = clampInput(stayCostInput, 0, 10000);
  const foodPerPerson = clampInput(foodCostInput, 0, 1000);
  const transportPerPerson = clampInput(localTransportInput, 0, 1000);
  const rooms = Math.ceil(travelers / 2);
  const stayTotal = stayPerRoom * nights * rooms;
  const foodTotal = foodPerPerson * days * travelers;
  const transportTotal = transportPerPerson * days * travelers;
  const selected = serviceInputs.filter((input) => input.checked);
  const servicesTotal = selected.reduce((sum, input) => {
    const price = Number(input.dataset.price);
    return sum + (input.dataset.kind === 'group' ? price * Math.ceil(travelers / 4) : price * travelers);
  }, 0);
  const total = stayTotal + foodTotal + transportTotal + servicesTotal;

  breakdown.innerHTML = `
    <div><span>Naktsmītne (${rooms} ist. × ${nights} n.)</span><strong>${formatMoney(stayTotal)}</strong></div>
    <div><span>Ēdiens (${travelers} pers. × ${days} d.)</span><strong>${formatMoney(foodTotal)}</strong></div>
    <div><span>Pilsētas transports</span><strong>${formatMoney(transportTotal)}</strong></div>
    <div><span>Papildu pakalpojumi</span><strong>${formatMoney(servicesTotal)}</strong></div>`;
  totalOutput.textContent = formatMoney(total);
  estimateNote.textContent = 'Orientējošs aprēķins: vienā numurā uzturas līdz 2 cilvēkiem; cenas vari mainīt pēc savām vajadzībām.';
  return { travelers, days, nights, total, selected };
}

// Обновление суммы
[travelersInput, daysInput, nightsInput, stayCostInput, foodCostInput, localTransportInput]
  .forEach((input) => input.addEventListener('input', calculateTrip));
serviceInputs.forEach((input) => input.addEventListener('change', calculateTrip));
calculateTrip();

// Добавление расчёта в заявку
document.querySelector('#add-plan').addEventListener('click', () => {
  const { travelers, days, nights, total, selected } = calculateTrip();
  const services = selected.length
    ? selected.map((item) => serviceNames[item.value]).join(', ')
    : 'papildu pakalpojumi nav izvēlēti';
  const summary = `Budžeta plāns: ${days} dienas, ${nights} naktis, ${travelers} ceļotāji. Pakalpojumi: ${services}. Aptuvenā kopējā summa: ${formatMoney(total)}.`;
  const interests = form.elements.interests;
  interests.value = interests.value.trim() ? `${interests.value.trim()}\n${summary}` : summary;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  interests.focus({ preventScroll: true });
});