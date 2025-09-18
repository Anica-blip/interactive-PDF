/**
 * Interactive elements creation for PDF documents
 * Handles form fields, buttons, links, annotations, and JavaScript actions
 */

import { PDFForm, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFButton } from 'pdf-lib';
import { FONTS, COLORS } from './config.js';

export class InteractiveElements {
  constructor(pdfCreator) {
    this.pdfCreator = pdfCreator;
    this.form = null;
    this.elementCounter = 0;
    this.links = [];
    this.annotations = [];
  }

  /**
   * Initialize form for the PDF document
   * @returns {PDFForm} - The PDF form object
   */
  initializeForm() {
    if (!this.pdfCreator.document) {
      throw new Error('PDF document not initialized');
    }

    try {
      this.form = this.pdfCreator.document.getForm();
      console.log('PDF form initialized');
      return this.form;
    } catch (error) {
      throw new Error(`Failed to initialize form: ${error.message}`);
    }
  }

  /**
   * Add a text input field to the current page
   * @param {Object} options - Text field configuration
   * @returns {PDFTextField} - The created text field
   */
  addTextField(options = {}) {
    if (!this.form) {
      this.initializeForm();
    }

    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page available');
    }

    try {
      // Generate unique field name
      const fieldName = options.name || `textField_${++this.elementCounter}`;
      
      // Text field configuration with defaults from config
      const textFieldOptions = {
        x: options.x || this.pdfCreator.config.page.margins.left,
        y: options.y || (this.pdfCreator.currentPage.getHeight() - 100),
        width: options.width || 200,
        height: options.height || 30,
        fontSize: options.fontSize || this.pdfCreator.config.interactive.textFields.fontSize,
        fontColor: options.fontColor || this.pdfCreator.config.interactive.textFields.fontColor,
        backgroundColor: options.backgroundColor || this.pdfCreator.config.interactive.textFields.backgroundColor,
        borderColor: options.borderColor || this.pdfCreator.config.interactive.textFields.borderColor,
        borderWidth: options.borderWidth || this.pdfCreator.config.interactive.textFields.borderWidth,
        placeholder: options.placeholder || '',
        defaultValue: options.defaultValue || '',
        multiline: options.multiline || false,
        maxLength: options.maxLength || null,
        required: options.required || false,
        readOnly: options.readOnly || false
      };

      // Create text field
      const textField = this.form.createTextField(fieldName);
      
      // Set field properties
      textField.setText(textFieldOptions.defaultValue);
      textField.setFontSize(textFieldOptions.fontSize);
      
      if (textFieldOptions.maxLength) {
        textField.setMaxLength(textFieldOptions.maxLength);
      }
      
      if (textFieldOptions.multiline) {
        textField.enableMultiline();
      }
      
      if (textFieldOptions.required) {
        textField.enableRequired();
      }
      
      if (textFieldOptions.readOnly) {
        textField.enableReadOnly();
      }

      // Add field widget to current page
      textField.addToPage(this.pdfCreator.currentPage, {
        x: textFieldOptions.x,
        y: textFieldOptions.y,
        width: textFieldOptions.width,
        height: textFieldOptions.height,
        backgroundColor: this.pdfCreator.parseColor(textFieldOptions.backgroundColor),
        borderColor: this.pdfCreator.parseColor(textFieldOptions.borderColor),
        borderWidth: textFieldOptions.borderWidth
      });

      this.registerElement('textField', fieldName, textFieldOptions);
      console.log(`Text field added: ${fieldName}`);
      return textField;
    } catch (error) {
      throw new Error(`Failed to add text field: ${error.message}`);
    }
  }

  /**
   * Add a checkbox to the current page
   * @param {Object} options - Checkbox configuration
   * @returns {PDFCheckBox} - The created checkbox
   */
  addCheckbox(options = {}) {
    if (!this.form) {
      this.initializeForm();
    }

    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page available');
    }

    try {
      const fieldName = options.name || `checkbox_${++this.elementCounter}`;
      
      const checkboxOptions = {
        x: options.x || this.pdfCreator.config.page.margins.left,
        y: options.y || (this.pdfCreator.currentPage.getHeight() - 100),
        size: options.size || this.pdfCreator.config.interactive.checkboxes.size,
        checked: options.checked || false,
        label: options.label || '',
        labelPosition: options.labelPosition || 'right', // 'left', 'right', 'top', 'bottom'
        labelOffset: options.labelOffset || 5
      };

      // Create checkbox
      const checkbox = this.form.createCheckBox(fieldName);
      
      if (checkboxOptions.checked) {
        checkbox.check();
      }

      // Add checkbox widget to page
      checkbox.addToPage(this.pdfCreator.currentPage, {
        x: checkboxOptions.x,
        y: checkboxOptions.y,
        width: checkboxOptions.size,
        height: checkboxOptions.size,
        borderColor: this.pdfCreator.parseColor(this.pdfCreator.config.interactive.checkboxes.borderColor),
        borderWidth: this.pdfCreator.config.interactive.checkboxes.borderWidth
      });

      // Add label if provided
      if (checkboxOptions.label) {
        this.addCheckboxLabel(checkboxOptions);
      }

      this.registerElement('checkbox', fieldName, checkboxOptions);
      console.log(`Checkbox added: ${fieldName}`);
      return checkbox;
    } catch (error) {
      throw new Error(`Failed to add checkbox: ${error.message}`);
    }
  }

  /**
   * Add a dropdown/select field to the current page
   * @param {Object} options - Dropdown configuration
   * @returns {PDFDropdown} - The created dropdown
   */
  addDropdown(options = {}) {
    if (!this.form) {
      this.initializeForm();
    }

    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page available');
    }

    if (!options.options || !Array.isArray(options.options)) {
      throw new Error('Dropdown options must be provided as an array');
    }

    try {
      const fieldName = options.name || `dropdown_${++this.elementCounter}`;
      
      const dropdownOptions = {
        x: options.x || this.pdfCreator.config.page.margins.left,
        y: options.y || (this.pdfCreator.currentPage.getHeight() - 100),
        width: options.width || 150,
        height: options.height || 25,
        options: options.options,
        defaultValue: options.defaultValue || '',
        fontSize: options.fontSize || 12
      };

      // Create dropdown
      const dropdown = this.form.createDropdown(fieldName);
      
      // Add options
      dropdown.addOptions(dropdownOptions.options);
      
      if (dropdownOptions.defaultValue) {
        dropdown.select(dropdownOptions.defaultValue);
      }

      // Add dropdown widget to page
      dropdown.addToPage(this.pdfCreator.currentPage, {
        x: dropdownOptions.x,
        y: dropdownOptions.y,
        width: dropdownOptions.width,
        height: dropdownOptions.height
      });

      this.registerElement('dropdown', fieldName, dropdownOptions);
      console.log(`Dropdown added: ${fieldName}`);
      return dropdown;
    } catch (error) {
      throw new Error(`Failed to add dropdown: ${error.message}`);
    }
  }

  /**
   * Add radio button group to the current page
   * @param {Object} options - Radio group configuration
   * @returns {PDFRadioGroup} - The created radio group
   */
  addRadioGroup(options = {}) {
    if (!this.form) {
      this.initializeForm();
    }

    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page available');
    }

    if (!options.options || !Array.isArray(options.options)) {
      throw new Error('Radio group options must be provided as an array');
    }

    try {
      const groupName = options.name || `radioGroup_${++this.elementCounter}`;
      
      const radioOptions = {
        x: options.x || this.pdfCreator.config.page.margins.left,
        y: options.y || (this.pdfCreator.currentPage.getHeight() - 100),
        size: options.size || 16,
        spacing: options.spacing || 30,
        direction: options.direction || 'vertical', // 'vertical' or 'horizontal'
        options: options.options,
        defaultValue: options.defaultValue || null
      };

      // Create radio group
      const radioGroup = this.form.createRadioGroup(groupName);
      
      // Add radio buttons
      radioOptions.options.forEach((option, index) => {
        const buttonValue = typeof option === 'object' ? option.value : option;
        const buttonLabel = typeof option === 'object' ? option.label : option;
        
        let buttonX = radioOptions.x;
        let buttonY = radioOptions.y;
        
        if (radioOptions.direction === 'vertical') {
          buttonY -= index * radioOptions.spacing;
        } else {
          buttonX += index * radioOptions.spacing;
        }

        radioGroup.addOptionToPage(buttonValue, this.pdfCreator.currentPage, {
          x: buttonX,
          y: buttonY,
          width: radioOptions.size,
          height: radioOptions.size
        });

        // Add label
        if (buttonLabel !== buttonValue) {
          this.pdfCreator.addText(buttonLabel, {
            x: buttonX + radioOptions.size + 5,
            y: buttonY + radioOptions.size / 4,
            size: 10
          });
        }
      });

      if (radioOptions.defaultValue) {
        radioGroup.select(radioOptions.defaultValue);
      }

      this.registerElement('radioGroup', groupName, radioOptions);
      console.log(`Radio group added: ${groupName}`);
      return radioGroup;
    } catch (error) {
      throw new Error(`Failed to add radio group: ${error.message}`);
    }
  }

  /**
   * Add a clickable button with JavaScript action
   * @param {Object} options - Button configuration
   * @returns {Object} - Button information
   */
  addButton(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page available');
    }

    try {
      const buttonOptions = {
        x: options.x || this.pdfCreator.config.page.margins.left,
        y: options.y || (this.pdfCreator.currentPage.getHeight() - 50),
        width: options.width || 100,
        height: options.height || 30,
        text: options.text || 'Button',
        fontSize: options.fontSize || this.pdfCreator.config.interactive.buttons.fontSize,
        fontColor: options.fontColor || this.pdfCreator.config.interactive.buttons.fontColor,
        backgroundColor: options.backgroundColor || this.pdfCreator.config.interactive.buttons.backgroundColor,
        borderColor: options.borderColor || this.pdfCreator.config.interactive.buttons.borderColor,
        borderWidth: options.borderWidth || this.pdfCreator.config.interactive.buttons.borderWidth,
        cornerRadius: options.cornerRadius || this.pdfCreator.config.interactive.buttons.cornerRadius,
        action: options.action || 'this.print()',
        name: options.name || `button_${++this.elementCounter}`
      };

      // Validate JavaScript action
      if (this.pdfCreator.config.actions.enableJavaScript) {
        this.validateJavaScriptAction(buttonOptions.action);
      }

      // Draw button background
      this.pdfCreator.currentPage.drawRectangle({
        x: buttonOptions.x,
        y: buttonOptions.y,
        width: buttonOptions.width,
        height: buttonOptions.height,
        color: this.pdfCreator.parseColor(buttonOptions.backgroundColor),
        borderColor: this.pdfCreator.parseColor(buttonOptions.borderColor),
        borderWidth: buttonOptions.borderWidth
      });

      // Add button text
      const font = await this.pdfCreator.loadFont(FONTS.HELVETICA);
      const textWidth = font.widthOfTextAtSize(buttonOptions.text, buttonOptions.fontSize);
      const textX = buttonOptions.x + (buttonOptions.width - textWidth) / 2;
      const textY = buttonOptions.y + (buttonOptions.height - buttonOptions.fontSize) / 2;

      this.pdfCreator.currentPage.drawText(buttonOptions.text, {
        x: textX,
        y: textY,
        size: buttonOptions.fontSize,
        font: font,
        color: this.pdfCreator.parseColor(buttonOptions.fontColor)
      });

      // Note: Actual JavaScript action embedding requires manual PDF manipulation
      // This is a limitation of pdf-lib library
      console.warn(`Button "${buttonOptions.name}" created. JavaScript actions require manual PDF editing.`);
      
      this.registerElement('button', buttonOptions.name, buttonOptions);
      console.log(`Button added: ${buttonOptions.name}`);
      return buttonOptions;
    } catch (error) {
      throw new Error(`Failed to add button: ${error.message}`);
    }
  }

  /**
   * Add a hyperlink annotation
   * @param {Object} options - Link configuration
   * @returns {Object} - Link information
   */
  addLink(options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page available');
    }

    try {
      const linkOptions = {
        x: options.x || this.pdfCreator.config.page.margins.left,
        y: options.y || (this.pdfCreator.currentPage.getHeight() - 100),
        width: options.width || 200,
        height: options.height || 20,
        url: options.url || '',
        text: options.text || options.url || 'Link',
        fontSize: options.fontSize || this.pdfCreator.config.interactive.links.fontSize,
        color: options.color || this.pdfCreator.config.interactive.links.color,
        underline: options.underline !== false
      };

      if (!linkOptions.url) {
        throw new Error('Link URL is required');
      }

      // Add link text
      const font = await this.pdfCreator.loadFont(FONTS.HELVETICA);
      this.pdfCreator.currentPage.drawText(linkOptions.text, {
        x: linkOptions.x,
        y: linkOptions.y,
        size: linkOptions.fontSize,
        font: font,
        color: this.pdfCreator.parseColor(linkOptions.color)
      });

      // Add underline if requested
      if (linkOptions.underline) {
        this.pdfCreator.currentPage.drawLine({
          start: { x: linkOptions.x, y: linkOptions.y - 2 },
          end: { x: linkOptions.x + linkOptions.width, y: linkOptions.y - 2 },
          thickness: 1,
          color: this.pdfCreator.parseColor(linkOptions.color)
        });
      }

      // Create link annotation
      const linkAnnotation = this.pdfCreator.document.getPage(this.pdfCreator.pageCount - 1).createLinkAnnotation({
        rect: {
          x: linkOptions.x,
          y: linkOptions.y,
          width: linkOptions.width,
          height: linkOptions.height
        },
        uri: linkOptions.url
      });

      this.links.push({
        ...linkOptions,
        annotation: linkAnnotation,
        page: this.pdfCreator.pageCount
      });

      this.registerElement('link', `link_${this.links.length}`, linkOptions);
      console.log(`Link added: ${linkOptions.url}`);
      return linkOptions;
    } catch (error) {
      throw new Error(`Failed to add link: ${error.message}`);
    }
  }

  /**
   * Add checkbox label
   * @private
   */
  async addCheckboxLabel(checkboxOptions) {
    let labelX = checkboxOptions.x;
    let labelY = checkboxOptions.y;

    switch (checkboxOptions.labelPosition) {
      case 'right':
        labelX += checkboxOptions.size + checkboxOptions.labelOffset;
        labelY += checkboxOptions.size / 4;
        break;
      case 'left':
        labelX -= checkboxOptions.labelOffset;
        labelY += checkboxOptions.size / 4;
        break;
      case 'top':
        labelY += checkboxOptions.size + checkboxOptions.labelOffset;
        break;
      case 'bottom':
        labelY -= checkboxOptions.labelOffset;
        break;
    }

    await this.pdfCreator.addText(checkboxOptions.label, {
      x: labelX,
      y: labelY,
      size: 10
    });
  }

  /**
   * Validate JavaScript action string
   * @private
   */
  validateJavaScriptAction(action) {
    if (action.length > this.pdfCreator.config.actions.maxActionLength) {
      throw new Error(`JavaScript action exceeds maximum length (${this.pdfCreator.config.actions.maxActionLength})`);
    }

    // Check for allowed methods
    const allowedMethods = this.pdfCreator.config.actions.allowedMethods;
    const hasAllowedMethod = allowedMethods.some(method => action.includes(method));
    
    if (!hasAllowedMethod && this.pdfCreator.config.validation.strictMode) {
      console.warn(`JavaScript action may not contain allowed methods: ${action}`);
    }
  }

  /**
   * Register interactive element for tracking
   * @private
   */
  registerElement(type, name, options) {
    if (!this.pdfCreator.pages[this.pdfCreator.pageCount - 1]) {
      return;
    }

    const currentPageData = this.pdfCreator.pages[this.pdfCreator.pageCount - 1];
    currentPageData.interactiveElements.push({
      type,
      name,
      options,
      page: this.pdfCreator.pageCount
    });

    // Check element limit
    if (currentPageData.interactiveElements.length > this.pdfCreator.config.validation.maxInteractiveElements) {
      throw new Error(`Maximum interactive elements limit exceeded on page ${this.pdfCreator.pageCount}`);
    }
  }

  /**
   * Get all interactive elements statistics
   * @returns {Object} - Interactive elements statistics
   */
  getElementsStats() {
    const stats = {
      total: 0,
      byType: {},
      byPage: {}
    };

    this.pdfCreator.pages.forEach((pageData, index) => {
      const pageNum = index + 1;
      stats.byPage[pageNum] = pageData.interactiveElements.length;
      stats.total += pageData.interactiveElements.length;

      pageData.interactiveElements.forEach(element => {
        stats.byType[element.type] = (stats.byType[element.type] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Reset element counter
   */
  resetCounter() {
    this.elementCounter = 0;
  }
}
