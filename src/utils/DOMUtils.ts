/**
 * Safe DOM manipulation utilities to prevent XSS attacks
 */

export class DOMUtils {
  /**
   * Safely set text content with line breaks
   */
  static setTextWithBreaks(element: HTMLElement, lines: string[]): void {
    element.textContent = '';
    lines.forEach((line, index) => {
      element.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) {
        element.appendChild(document.createElement('br'));
      }
    });
  }

  /**
   * Safely create a labeled value element
   */
  static createLabeledValue(label: string, value: string): HTMLElement {
    const container = document.createElement('div');
    
    const labelElement = document.createElement('strong');
    labelElement.textContent = label + ': ';
    container.appendChild(labelElement);
    
    const valueText = document.createTextNode(value);
    container.appendChild(valueText);
    
    return container;
  }

  /**
   * Safely update a labeled values list
   */
  static updateLabeledValues(element: HTMLElement, values: Array<{label: string, value: string}>): void {
    element.textContent = '';
    values.forEach((item, index) => {
      const line = this.createLabeledValue(item.label, item.value);
      element.appendChild(line);
      if (index < values.length - 1) {
        element.appendChild(document.createElement('br'));
      }
    });
  }

  /**
   * Safely create an element with text content
   */
  static createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    textContent?: string,
    className?: string
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    if (textContent) {
      element.textContent = textContent;
    }
    if (className) {
      element.className = className;
    }
    return element;
  }

  /**
   * Safely append multiple elements
   */
  static appendChildren(parent: HTMLElement, children: HTMLElement[]): void {
    children.forEach(child => parent.appendChild(child));
  }

  /**
   * Safely create a button with text and click handler
   */
  static createButton(text: string, onClick: () => void, className?: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    if (className) {
      button.className = className;
    }
    return button;
  }

  /**
   * Sanitize text for safe display (escapes HTML)
   */
  static sanitizeText(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create a safe HTML structure from a template
   */
  static createFromTemplate(template: {
    tag: keyof HTMLElementTagNameMap;
    className?: string;
    textContent?: string;
    children?: any[];
    attributes?: Record<string, string>;
  }): HTMLElement {
    const element = document.createElement(template.tag);
    
    if (template.className) {
      element.className = template.className;
    }
    
    if (template.textContent) {
      element.textContent = template.textContent;
    }
    
    if (template.attributes) {
      Object.entries(template.attributes).forEach(([key, value]) => {
        if (key !== 'innerHTML' && key !== 'outerHTML') { // Prevent innerHTML injection
          element.setAttribute(key, value);
        }
      });
    }
    
    if (template.children) {
      template.children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
          element.appendChild(child);
        } else if (child && typeof child === 'object') {
          element.appendChild(this.createFromTemplate(child));
        }
      });
    }
    
    return element;
  }
}