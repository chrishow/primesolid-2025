// --- Glitch Text Effect ---
const glitchChars = '0123456789';

// Map to store active interval IDs for glitching elements
const activeGlitches = new Map<HTMLElement, number>();
// Map to store original text node data
const originalTextNodes = new Map<HTMLElement, { node: Text, originalValue: string }[]>();

function getRandomChar(chars: string): string {
    return chars[Math.floor(Math.random() * chars.length)];
}

function glitchText(element: HTMLElement, intensity: number = 0.1, duration: number = 300): number | undefined {
    const textNodesData: { node: Text, originalValue: string }[] = [];
    // Use TreeWalker to find all text nodes within the element
    const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let currentNode;
    while (currentNode = treeWalker.nextNode()) {
        // Only consider non-empty text nodes
        if (currentNode.nodeValue && currentNode.nodeValue.trim() !== '') {
            textNodesData.push({ node: currentNode as Text, originalValue: currentNode.nodeValue });
        }
    }

    // If no text nodes found, do nothing
    if (textNodesData.length === 0) return;

    originalTextNodes.set(element, textNodesData); // Store original text node data

    let startTime = Date.now();
    let intervalId: number | undefined = undefined;

    function updateText() {
        const elapsedTime = Date.now() - startTime;
        const nodesData = originalTextNodes.get(element);

        if (elapsedTime >= duration) {
            // Restore original text for all nodes
            if (nodesData) {
                nodesData.forEach(data => {
                    data.node.nodeValue = data.originalValue;
                });
            }
            element.classList.add('done-glitching');
            if (intervalId !== undefined) {
                clearInterval(intervalId);
                activeGlitches.delete(element); // Remove from active map
                originalTextNodes.delete(element); // Clean up original text map
            }
            return;
        }

        // Glitch text for each node
        if (nodesData) {
            nodesData.forEach(data => {
                const originalText = data.originalValue;
                let newText = '';
                for (let i = 0; i < originalText.length; i++) {
                    // Apply glitch based on intensity, avoiding spaces/newlines
                    if (Math.random() < intensity && originalText[i] !== ' ' && originalText[i] !== '\\n') {
                        newText += getRandomChar(glitchChars);
                    } else {
                        newText += originalText[i];
                    }
                }
                // Update the text node's value
                data.node.nodeValue = newText;
            });
        }
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

                    // Restore original state immediately by restoring text node values
                    const nodesData = originalTextNodes.get(element);
                    if (nodesData) {
                        nodesData.forEach(data => {
                            data.node.nodeValue = data.originalValue;
                        });
                        originalTextNodes.delete(element); // Clean up map
                    }
                    element.classList.remove('done-glitching'); // Remove glitching class if used
                } else {
                    // Ensure cleanup even if no active interval (e.g., glitch finished before leaving)
                    const nodesData = originalTextNodes.get(element);
                    if (nodesData) {
                        nodesData.forEach(data => {
                            data.node.nodeValue = data.originalValue;
                        });
                        originalTextNodes.delete(element); // Clean up map
                    }
                    element.classList.remove('done-glitching'); // Remove glitching class if used
                }
            }
        });
    }, observerOptions);

    glitchElements.forEach(el => observer.observe(el as HTMLElement));
}
// --- End Glitch Text Effect ---
