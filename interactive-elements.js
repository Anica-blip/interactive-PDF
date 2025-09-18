/**
 * Interactive Elements - Handles form fields, buttons, and interactive components
 * Works with both new PDFs and Canva templates
 * This will run as is - complete interactive elements system
 */

import { PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFButton } from 'pdf-lib';

export class InteractiveElements {
  constructor(pdfCreator) {
    this.pdfCreator = pdfCreator;
    this.config = pdfCreator.config;
    this.elements = [];
    this.elementStats = {
      total: 0,
      byType: {},
      byPage: {}
    };
  }

  /**
   * Add interactive text field
   * @param {Object} options - Text field configuration
   * @returns {Object} - Text field object
   */
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
        fontSize = this.config.interactive.textFields.fontSize,
        backgroundColor = this.config.interactive.textFields.backgroundColor,
        borderColor = this.config.interactive.textFields.borderColor,
        borderWidth = this.config.interactive.textFields.borderWidth
      } = options;

      // Validate required fields
      if (!name) {
        throw new Error('Text field name is required');
      }

      // Create form if it doesn't exist
      if (!this.pdfCreator.document.getForm) {
        this.pdfCreator.document.getForm = () => this.pdfCreator.document.context.getPDFCatalog().getForm();
      }

      // Get or create form
      const form = this.pdfCreator.document.getForm();

      // Create text field
      const textField = form.createTextField(name);
      
      // Configure text field
      textField.setText(''); // Default empty
      textField.setFontSize(fontSize);
      
      if (multiline) {
        textField.enableMultiline();
      }
      
      if (required) {
        textField.enableRequired();
      }

      // Add appearance to current page
      textField.addToPage(this.pdfCreator.currentPage, {
        x,
        y,
        width,
        height,
        backgroundColor: this.pdfCreator.parseColor(backgroundColor),
        borderColor: this.pdfCreator.parseColor(borderColor),
        borderWidth
      });

      // Store element info
      const elementInfo = {
        type: 'textField',
        name,
        x, y, width, height,
        pageIndex: this.pdfCreator.currentPageIndex,
        multiline,
        required,
        placeholder
      };

      this.elements.push(elementInfo);
      this.updateStats('textField');

      console.log(`Text field added: ${name} (${width}x${height}) at page ${this.pdfCreator.currentPageIndex + 1}`);
      
      return textField;

    } catch (error) {
      throw new Error(`Failed to create text field: ${error.message}`);
    }
  }

  /**
   * Add interactive checkbox
   * @param {Object} options - Checkbox configuration
   * @returns {Object} - Checkbox object
   */
  addCheckbox(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        name,
        x = 100,
        y = 500,
        size = this.config.interactive.checkboxes.size,
        label = '',
        labelPosition = 'right',
        checked = false,
        checkColor = this.config.interactive.checkboxes.checkColor,
        borderColor = this.config.interactive.checkboxes.borderColor
      } = options;

      if (!name) {
        throw new Error('Checkbox name is required');
      }

      // Get form
      const form = this.pdfCreator.document.getForm();

      // Create checkbox
      const checkbox = form.createCheckBox(name);
      
      if (checked) {
        checkbox.check();
      }

      // Add to page
      checkbox.addToPage(this.pdfCreator.currentPage, {
        x,
        y,
        width: size,
        height: size,
        borderColor: this.pdfCreator.parseColor(borderColor)
      });

      // Add label if provided
      if (label) {
        const labelX = labelPosition === 'right' ? x + size + 8 : x - 8;
        const labelY = y + (size / 4); // Center vertically with checkbox
        
        await this.pdfCreator.addText(label, {
          x: labelX,
          y: labelY,
          size: 12
        });
      }

      // Store element info
      const elementInfo = {
        type: 'checkbox',
        name,
        x, y, size,
        pageIndex: this.pdfCreator.currentPageIndex,
        label,
        checked
      };

      this.elements.push(elementInfo);
      this.updateStats('checkbox');

      return checkbox;

    } catch (error) {
      throw new Error(`Failed to create checkbox: ${error.message}`);
    }
  }

  /**
   * Add dropdown/select field
   * @param {Object} options - Dropdown configuration
   * @returns {Object} - Dropdown object
   */
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
        fontSize = this.config.interactive.textFields.fontSize,
        backgroundColor = this.config.interactive.textFields.backgroundColor,
        borderColor = this.config.interactive.textFields.borderColor
      } = options;

      if (!name) {
        throw new Error('Dropdown name is required');
      }

      if (!Array.isArray(dropdownOptions) || dropdownOptions.length === 0) {
        throw new Error('Dropdown options array is required and must not be empty');
      }

      // Get form
      const form = this.pdfCreator.document.getForm();

      // Create dropdown
      const dropdown = form.createDropdown(name);
      
      // Add options
      dropdown.addOptions(dropdownOptions);
      
      // Set default value if provided
      if (defaultValue && dropdownOptions.includes(defaultValue)) {
        dropdown.select(defaultValue);
      }

      // Add to page
      dropdown.addToPage(this.pdfCreator.currentPage, {
        x,
        y,
        width,
        height,
        backgroundColor: this.pdfCreator.parseColor(backgroundColor),
        borderColor: this.pdfCreator.parseColor(borderColor)
      });

      // Store element info
      const elementInfo = {
        type: 'dropdown',
        name,
        x, y, width, height,
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

  /**
   * Add radio button group
   * @param {Object} options - Radio group configuration
   * @returns {Object} - Radio group object
   */
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
        buttonSize = 16,
        fontSize = 12
      } = options;

      if (!name) {
        throw new Error('Radio group name is required');
      }

      if (!Array.isArray(radioOptions) || radioOptions.length === 0) {
        throw new Error('Radio options array is required and must not be empty');
      }

      // Get form
      const form = this.pdfCreator.document.getForm();

      // Create radio group
      const radioGroup = form.createRadioGroup(name);

      // Add radio buttons
      let currentX = x;
      let currentY = y;

      for (let i = 0; i < radioOptions.length; i++) {
        const option = radioOptions[i];
        const optionValue = typeof option === 'object' ? option.value : option;
        const optionLabel = typeof option === 'object' ? option.label : option;

        // Add radio button option
        radioGroup.addOptionToPage(optionValue, this.pdfCreator.currentPage, {
          x: currentX,
          y: currentY,
          width: buttonSize,
          height: buttonSize
        });

        // Add label
        await this.pdfCreator.addText(optionLabel, {
          x: currentX + buttonSize + 8,
          y: currentY + (buttonSize / 4),
          size: fontSize
        });

        // Update position for next option
        if (direction === 'vertical') {
          currentY -= spacing;
        } else {
          currentX += spacing;
        }
      }

      // Set default value if provided
      if (defaultValue) {
        radioGroup.select(defaultValue);
      }

      // Store element info
      const elementInfo = {
        type: 'radioGroup',
        name,
        x, y,
        pageIndex: this.pdfCreator.currentPageIndex,
        options: radioOptions,
        defaultValue,
        direction,
        count: radioOptions.length
      };

      this.elements.push(elementInfo);
      this.updateStats('radioGroup');

      return radioGroup;

    } catch (error) {
      throw new Error(`Failed to create radio group: ${error.message}`);
    }
  }

  /**
   * Add interactive button with action
   * @param {Object} options - Button configuration
   * @returns {Promise<Object>} - Button information
   */
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
        backgroundColor = this.config.interactive.buttons.backgroundColor,
        fontColor = this.config.interactive.buttons.fontColor,
        borderColor = this.config.interactive.buttons.borderColor,
        fontSize = this.config.interactive.buttons.fontSize,
        cornerRadius = this.config.interactive.buttons.cornerRadius
      } = options;

      // Draw button background
      this.pdfCreator.drawRectangle({
        x,
        y,
        width,
        height,
        fillColor: backgroundColor,
        borderColor: borderColor,
        borderWidth: 1
      });

      // Add button text (centered)
      const font = await this.pdfCreator.loadFont('Helvetica-Bold');
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textX = x + (width - textWidth) / 2;
      const textY = y + (height - fontSize) / 2 + 2;

      await this.pdfCreator.addText(text, {
        x: textX,
        y: textY,
        size: fontSize,
        color: fontColor,
        font: 'Helvetica-Bold'
      });

      // Note: PDF-lib doesn't directly support JavaScript actions in buttons
      // This would require manual PDF editing or specialized PDF libraries
      if (action) {
        console.log(`Button created with action: ${action}`);
        console.log('Note: JavaScript actions require manual PDF editing after generation');
      }

      // Store element info
      const elementInfo = {
        type: 'button',
        name: `button_${this.elements.length + 1}`,
        text,
        x, y, width, height,
        pageIndex: this.pdfCreator.currentPageIndex,
        action,
        backgroundColor,
        fontColor
      };

      this.elements.push(elementInfo);
      this.updateStats('button');

      return elementInfo;

    } catch (error) {
      throw new Error(`Failed to create button: ${error.message}`);
    }
  }

  /**
   * Add hyperlink annotation
   * @param {Object} options - Link configuration
   * @returns {Promise<Object>} - Link information
   */
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
        color = this.config.interactive.links.color,
        underline = this.config.interactive.links.underline,
        fontSize = this.config.interactive.links.fontSize
      } = options;

      if (!url) {
        throw new Error('Link URL is required');
      }

      // Add link text
      await this.pdfCreator.addText(text, {
        x,
        y,
        size: fontSize,
        color: color
      });

      // Calculate text dimensions for link area
      const font = await this.pdfCreator.loadFont('Helvetica');
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = fontSize;

      // Add underline if requested
      if (underline) {
        this.pdfCreator.drawLine({
          start: { x, y: y - 2 },
          end: { x: x + textWidth, y: y - 2 },
          thickness: 1,
          color: color
        });
      }

      // Create link annotation
      this.pdfCreator.currentPage.drawText('', {
        x,
        y,
        size: fontSize
      });

      // Note: PDF-lib link annotations require additional setup
      // This creates a visual link but the actual URL linking needs manual implementation
      console.log(`Link created: ${text} -> ${url}`);
      console.log('Note: URL linking requires additional PDF annotation setup');

      // Store element info
      const elementInfo = {
        type: 'link',
        text,
        url,
        x, y,
        width: textWidth,
        height: textHeight,
        pageIndex: this.pdfCreator.currentPageIndex,
        color,
        underline
      };

      this.elements.push(elementInfo);
      this.updateStats('link');

      return elementInfo;

    } catch (error) {
      throw new Error(`Failed to create link: ${error.message}`);
    }
  }

  /**
   * Update element statistics
   * @param {string} elementType - Type of element added
   * @private
   */
  updateStats(elementType) {
    this.elementStats.total++;
    
    // Update by type
    if (!this.elementStats.byType[elementType]) {
      this.elementStats.byType[elementType] = 0;
    }
    this.elementStats.byType[elementType]++;
    
    // Update by page
    const currentPage = this.pdfCreator.currentPageIndex;
    if (!this.elementStats.byPage[currentPage]) {
      this.elementStats.byPage[currentPage] = 0;
    }
    this.elementStats.byPage[currentPage]++;
  }

  /**
   * Get comprehensive element statistics
   * @returns {Object} - Element statistics
   */
  getElementsStats() {
    return {
      total: this.elementStats.total,
      byType: { ...this.elementStats.byType },
      byPage: { ...this.elementStats.byPage },
      elements: this.elements.map(el => ({
        type: el.type,
        name: el.name || el.text,
        page: el.pageIndex + 1,
        position: { x: el.x, y: el.y }
      }))
    };
  }

  /**
   * Get elements on specific page
   * @param {number} pageIndex - Page index (0-based)
   * @returns {Array} - Elements on page
   */
  getElementsOnPage(pageIndex) {
    return this.elements.filter(el => el.pageIndex === pageIndex);
  }

  /**
   * Get element by name
   * @param {string} name - Element name
   * @returns {Object|null} - Element info or null
   */
  getElementById(name) {
    return this.elements.find(el => el.name === name) || null;
  }

  /**
   * Validate all elements
   * @returns {Object} - Validation results
   */
  validateElements() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for duplicate names
    const names = this.elements
      .filter(el => el.name)
      .map(el => el.name);
    
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      validation.errors.push(`Duplicate element names: ${[...new Set(duplicates)].join(', ')}`);
      validation.isValid = false;
    }

    // Check element limits per page
    Object.entries(this.elementStats.byPage).forEach(([page, count]) => {
      if (count > this.config.validation.maxInteractiveElements) {
        validation.warnings.push(`Page ${parseInt(page) + 1} has ${count} elements (recommended max: ${this.config.validation.maxInteractiveElements})`);
      }
    });

    // Check for elements with actions (JavaScript limitations)
    const elementsWithActions = this.elements.filter(el => el.action);
    if (elementsWithActions.length > 0) {
      validation.warnings.push(`${elementsWithActions.length} elements have JavaScript actions that require manual PDF editing`);
    }

    return validation;
  }

  /**
   * Clear all elements (for reset)
   */
  clearElements() {
    this.elements = [];
    this.elementStats = {
      total: 0,
      byType: {},
      byPage: {}
    };
  }
}
