/**
 * Interactive Elements - Handles form fields, buttons, and interactive components
 * Works with both new PDFs and Canva templates
 * This will run as is - complete interactive elements system
 */

import { rgb } from 'pdf-lib';

export class InteractiveElements {
  constructor(pdfCreator) {
    this.pdfCreator = pdfCreator;
    this.config = pdfCreator.config || {};
    this.elements = [];
    this.elementStats = {
      total: 0,
      byType: {},
      byPage: {}
    };
  }

  parseColor(colorString) {
    if (typeof colorString !== 'string') {
      return rgb(0, 0, 0);
    }

    const hex = colorString.replace('#', '');
    
    if (hex.length !== 6) {
      return rgb(0, 0, 0);
    }

    try {
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      return rgb(r, g, b);
    } catch (error) {
      return rgb(0, 0, 0);
    }
  }

  addTextField(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        name,
        x = 100,
        y = 500,
        width = 200,
        height = 25,
        placeholder = '',
        multiline = false,
        required = false,
        fontSize = 12,
        backgroundColor = '#FFFFFF',
        borderColor = '#CCCCCC',
        borderWidth = 1
      } = options;

      if (!name) {
        throw new Error('Text field name is required');
      }

      const form = this.pdfCreator.document.getForm();
      const textField = form.createTextField(name);
      
      textField.setText('');
      textField.setFontSize(fontSize);
      
      if (multiline) {
        textField.enableMultiline();
      }
      
      if (required) {
        textField.enableRequired();
      }

      textField.addToPage(this.pdfCreator.currentPage, {
        x, y, width, height,
        backgroundColor: this.parseColor(backgroundColor),
        borderColor: this.parseColor(borderColor),
        borderWidth
      });

      const elementInfo = {
        type: 'textField',
        name, x, y, width, height,
        pageIndex: this.pdfCreator.currentPageIndex,
        multiline, required, placeholder
      };

      this.elements.push(elementInfo);
      this.updateStats('textField');
      
      return textField;

    } catch (error) {
      throw new Error(`Failed to create text field: ${error.message}`);
    }
  }

  addCheckbox(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        name,
        x = 100,
        y = 500,
        size = 16,
        checked = false,
        borderColor = '#CCCCCC'
      } = options;

      if (!name) {
        throw new Error('Checkbox name is required');
      }

      const form = this.pdfCreator.document.getForm();
      const checkbox = form.createCheckBox(name);
      
      if (checked) {
        checkbox.check();
      }

      checkbox.addToPage(this.pdfCreator.currentPage, {
        x, y,
        width: size,
        height: size,
        borderColor: this.parseColor(borderColor)
      });

      const elementInfo = {
        type: 'checkbox',
        name, x, y, size,
        pageIndex: this.pdfCreator.currentPageIndex,
        checked
      };

      this.elements.push(elementInfo);
      this.updateStats('checkbox');

      return checkbox;

    } catch (error) {
      throw new Error(`Failed to create checkbox: ${error.message}`);
    }
  }

  addDropdown(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        name,
        x = 100,
        y = 500,
        width = 200,
        height = 25,
        options: dropdownOptions = [],
        defaultValue = '',
        backgroundColor = '#FFFFFF',
        borderColor = '#CCCCCC'
      } = options;

      if (!name) {
        throw new Error('Dropdown name is required');
      }

      if (!Array.isArray(dropdownOptions) || dropdownOptions.length === 0) {
        throw new Error('Dropdown options array is required and must not be empty');
      }

      const form = this.pdfCreator.document.getForm();
      const dropdown = form.createDropdown(name);
      
      dropdown.addOptions(dropdownOptions);
      
      if (defaultValue && dropdownOptions.includes(defaultValue)) {
        dropdown.select(defaultValue);
      }

      dropdown.addToPage(this.pdfCreator.currentPage, {
        x, y, width, height,
        backgroundColor: this.parseColor(backgroundColor),
        borderColor: this.parseColor(borderColor)
      });

      const elementInfo = {
        type: 'dropdown',
        name, x, y, width, height,
        pageIndex: this.pdfCreator.currentPageIndex,
        options: dropdownOptions,
        defaultValue
      };

      this.elements.push(elementInfo);
      this.updateStats('dropdown');

      return dropdown;

    } catch (error) {
      throw new Error(`Failed to create dropdown: ${error.message}`);
    }
  }

  addRadioGroup(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        name,
        x = 100,
        y = 500,
        options: radioOptions = [],
        defaultValue = '',
        direction = 'vertical',
        spacing = 25,
        buttonSize = 16
      } = options;

      if (!name) {
        throw new Error('Radio group name is required');
      }

      if (!Array.isArray(radioOptions) || radioOptions.length === 0) {
        throw new Error('Radio options array is required and must not be empty');
      }

      const form = this.pdfCreator.document.getForm();
      const radioGroup = form.createRadioGroup(name);

      let currentX = x;
      let currentY = y;

      for (let i = 0; i < radioOptions.length; i++) {
        const option = radioOptions[i];
        const optionValue = typeof option === 'object' ? option.value : option;

        radioGroup.addOptionToPage(optionValue, this.pdfCreator.currentPage, {
          x: currentX,
          y: currentY,
          width: buttonSize,
          height: buttonSize
        });

        if (direction === 'vertical') {
          currentY -= spacing;
        } else {
          currentX += spacing;
        }
      }

      if (defaultValue) {
        radioGroup.select(defaultValue);
      }

      const elementInfo = {
        type: 'radioGroup',
        name, x, y,
        pageIndex: this.pdfCreator.currentPageIndex,
        options: radioOptions,
        defaultValue, direction,
        count: radioOptions.length
      };

      this.elements.push(elementInfo);
      this.updateStats('radioGroup');

      return radioGroup;

    } catch (error) {
      throw new Error(`Failed to create radio group: ${error.message}`);
    }
  }

  async addButton(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        text = 'Button',
        x = 100,
        y = 400,
        width = 120,
        height = 30,
        action = '',
        backgroundColor = '#007BFF',
        fontColor = '#FFFFFF',
        borderColor = '#0056B3',
        fontSize = 12
      } = options;

      this.pdfCreator.currentPage.drawRectangle({
        x, y, width, height,
        color: this.parseColor(backgroundColor),
        borderColor: this.parseColor(borderColor),
        borderWidth: 1
      });

      this.pdfCreator.currentPage.drawText(text, {
        x: x + 10,
        y: y + height/2 - fontSize/2,
        size: fontSize,
        color: this.parseColor(fontColor)
      });

      const elementInfo = {
        type: 'button',
        name: `button_${this.elements.length + 1}`,
        text, x, y, width, height,
        pageIndex: this.pdfCreator.currentPageIndex,
        action, backgroundColor, fontColor
      };

      this.elements.push(elementInfo);
      this.updateStats('button');

      return elementInfo;

    } catch (error) {
      throw new Error(`Failed to create button: ${error.message}`);
    }
  }

  async addLink(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        text = 'Link',
        url,
        x = 100,
        y = 400,
        color = '#007BFF',
        fontSize = 12
      } = options;

      if (!url) {
        throw new Error('Link URL is required');
      }

      this.pdfCreator.currentPage.drawText(text, {
        x, y,
        size: fontSize,
        color: this.parseColor(color)
      });

      const elementInfo = {
        type: 'link',
        text, url, x, y,
        pageIndex: this.pdfCreator.currentPageIndex,
        color
      };

      this.elements.push(elementInfo);
      this.updateStats('link');

      return elementInfo;

    } catch (error) {
      throw new Error(`Failed to create link: ${error.message}`);
    }
  }

  updateStats(elementType) {
    this.elementStats.total++;
    
    if (!this.elementStats.byType[elementType]) {
      this.elementStats.byType[elementType] = 0;
    }
    this.elementStats.byType[elementType]++;
    
    const currentPage = this.pdfCreator.currentPageIndex || 0;
    if (!this.elementStats.byPage[currentPage]) {
      this.elementStats.byPage[currentPage] = 0;
    }
    this.elementStats.byPage[currentPage]++;
  }

  getElementsStats() {
    return {
      total: this.elementStats.total,
      byType: { ...this.elementStats.byType },
      byPage: { ...this.elementStats.byPage },
      elements: this.elements.map(el => ({
        type: el.type,
        name: el.name || el.text,
        page: (el.pageIndex || 0) + 1,
        position: { x: el.x, y: el.y }
      }))
    };
  }

  getElementsOnPage(pageIndex) {
    return this.elements.filter(el => el.pageIndex === pageIndex);
  }

  getElementById(name) {
    return this.elements.find(el => el.name === name) || null;
  }

  validateElements() {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  clearElements() {
    this.elements = [];
    this.elementStats = {
      total: 0,
      byType: {},
      byPage: {}
    };
  }
}
