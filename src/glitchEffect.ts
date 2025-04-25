// --- Glitch Text Effect ---
const glitchChars = '0123456789';

// Map to store active interval IDs for glitching elements
const activeGlitches = new Map<HTMLElement, number>();
// Map to store original text content
const originalTexts = new Map<HTMLElement, string>();

function getRandomChar(chars: string): string {
    return chars[Math.floor(Math.random() * chars.length)];
}

function glitchText(element: HTMLElement, intensity: number = 0.1, duration: number = 300): number | undefined {
    const originalText = element.textContent || '';
    originalTexts.set(element, originalText); // Store original text
    let startTime = Date.now();
    let intervalId: number | undefined = undefined;

    function updateText() {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= duration) {
            element.textContent = originalText; // Restore original text
            element.classList.add('done-glitching');
            if (intervalId !== undefined) {
                clearInterval(intervalId);
                activeGlitches.delete(element); // Remove from active map
                originalTexts.delete(element); // Clean up original text map
            }
            return;
        }

        let newText = '';
        for (let i = 0; i < originalText.length; i++) {
            if (Math.random() < intensity && originalText[i] !== ' ' && originalText[i] !== '\n') {
                newText += getRandomChar(glitchChars);
            } else {
                newText += originalText[i];
            }
        }
        element.textContent = newText;
    }

    intervalId = window.setInterval(updateText, 50);
    activeGlitches.set(element, intervalId); // Store interval ID
    return intervalId; // Return the interval ID
}

export function initializeGlitchEffect(selector: string) {
    const glitchElements = document.querySelectorAll(selector);

    const observerOptions = {
        root: null, // Use the viewport as the root
        rootMargin: '0px',
        threshold: 0.1 // Trigger when >= 10% is visible, and when < 10% is visible
    };

    const observer = new IntersectionObserver((entries, _observer) => {
        entries.forEach(entry => {
            const element = entry.target as HTMLElement;
            if (entry.isIntersecting) {
                // Only start glitch if not already glitching for this element
                if (!activeGlitches.has(element)) {
                    glitchText(element, 0.07, 500);
                }
            } else {
                // Element is leaving viewport (or less than 10% visible)
                const intervalId = activeGlitches.get(element);
                if (intervalId !== undefined) {
                    // Stop the active glitch animation
                    clearInterval(intervalId);
                    activeGlitches.delete(element);

                    // Restore original state immediately
                    const originalText = originalTexts.get(element);
                    if (originalText !== undefined) {
                        element.textContent = originalText;
                        originalTexts.delete(element); // Clean up map
                    }
                    element.classList.remove('done-glitching'); // Remove glitching class if used
                } else {
                    element.classList.remove('done-glitching'); // Remove glitching class if used
                }
            }
        });
    }, observerOptions);

    glitchElements.forEach(el => observer.observe(el as HTMLElement));
}
// --- End Glitch Text Effect ---
