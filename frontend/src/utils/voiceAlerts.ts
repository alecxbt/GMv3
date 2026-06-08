// Voice alerts for price changes and important events

let speechSynthesis: SpeechSynthesis | null = null;

export function initVoiceAlerts() {
  if ('speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;
  }
}

export function speakAlert(message: string, priority: 'low' | 'medium' | 'high' = 'medium') {
  if (!speechSynthesis) {
    console.warn('Speech synthesis not available');
    return;
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  
  // Adjust rate and pitch based on priority
  switch (priority) {
    case 'high':
      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      break;
    case 'medium':
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      break;
    case 'low':
      utterance.rate = 0.9;
      utterance.pitch = 0.9;
      break;
  }

  utterance.volume = 0.8;
  speechSynthesis.speak(utterance);
}

export function speakPriceAlert(ticker: string, price: number, change: number, changePercent: number) {
  const direction = change >= 0 ? 'up' : 'down';
  const message = `${ticker} is ${direction} ${Math.abs(changePercent).toFixed(2)} percent to ${price.toFixed(2)}`;
  speakAlert(message, Math.abs(changePercent) > 5 ? 'high' : 'medium');
}

export function stopVoiceAlerts() {
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }
}

