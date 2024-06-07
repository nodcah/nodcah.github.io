let flipCount = 0;
const pizza = document.getElementById('pizza');
const flipCountDisplay = document.getElementById('flip-count');
const resetButton = document.getElementById('reset-button');

pizza.addEventListener('click', () => {
    pizza.classList.toggle('flipped');
    flipCount++;
    flipCountDisplay.textContent = flipCount;
});

resetButton.addEventListener('click', () => {
    flipCount = 0;
    flipCountDisplay.textContent = flipCount;
    pizza.classList.remove('flipped');
});