  addHubBadgeSettings() {
    const plugin = this.plugin;
    const num = (value, fallback) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };
    new import_obsidian2.Setting(this.containerEl).setName("Calendar cell badges").setHeading();
    new import_obsidian2.Setting(this.containerEl).setName("Badge font family").setDesc(
      "Font family for the note / to-do counts in the top-right corner of each day cell. Leave empty to inherit the theme font."
    ).addText((textfield) => {
      textfield.setPlaceholder("inherit");
      textfield.setValue(plugin.options.hubBadgeFontFamily || "");
      textfield.onChange(async (value) => {
        await plugin.writeOptions(() => ({ hubBadgeFontFamily: value.trim() }));
      });
    });
    new import_obsidian2.Setting(this.containerEl).setName("Badge font size").setDesc(
      "Size in pixels of the badge numbers. The space between the date and the note dots is only about 17px tall, so 9px fits best; larger sizes will start to reach the dots."
    ).addSlider((slider) => {
      slider.setLimits(6, 11, 1);
      slider.setValue(num(plugin.options.hubBadgeFontSize, 9));
      slider.setDynamicTooltip();
      slider.onChange(async (value) => {
        await plugin.writeOptions(() => ({ hubBadgeFontSize: value }));
      });
    });
    new import_obsidian2.Setting(this.containerEl).setName("Badge font weight").setDesc(
      "Font weight of the badge numbers."
    ).addDropdown((dropdown) => {
      dropdown.addOption("400", "Normal (400)");
      dropdown.addOption("500", "Medium (500)");
      dropdown.addOption("600", "Semibold (600)");
      dropdown.addOption("700", "Bold (700)");
      dropdown.setValue(String(num(plugin.options.hubBadgeFontWeight, 500)));
      dropdown.onChange(async (value) => {
        await plugin.writeOptions(() => ({ hubBadgeFontWeight: num(value, 500) }));
      });
    });
    new import_obsidian2.Setting(this.containerEl).setName("Badge offset X").setDesc(
      "Distance in pixels from the cell's right edge. Larger moves the badges further left. In a very narrow pane the badges can touch the date."
    ).addSlider((slider) => {
      slider.setLimits(0, 40, 1);
      slider.setValue(num(plugin.options.hubBadgeOffsetX, 3));
      slider.setDynamicTooltip();
      slider.onChange(async (value) => {
        await plugin.writeOptions(() => ({ hubBadgeOffsetX: value }));
      });
    });
    new import_obsidian2.Setting(this.containerEl).setName("Badge offset Y").setDesc(
      "Distance in pixels from the cell's top edge. Larger moves both badges down, closer to the note dots."
    ).addSlider((slider) => {
      slider.setLimits(0, 6, 1);
      slider.setValue(num(plugin.options.hubBadgeOffsetY, 2));
      slider.setDynamicTooltip();
      slider.onChange(async (value) => {
        await plugin.writeOptions(() => ({ hubBadgeOffsetY: value }));
      });
    });
    new import_obsidian2.Setting(this.containerEl).setName("Badge gap").setDesc(
      "Vertical gap in pixels between the note count (top) and the to-do count below it. Set to 0 when the two badges feel too far apart."
    ).addSlider((slider) => {
      slider.setLimits(0, 8, 1);
      slider.setValue(num(plugin.options.hubBadgeGap, 1));
      slider.setDynamicTooltip();
      slider.onChange(async (value) => {
        await plugin.writeOptions(() => ({ hubBadgeGap: value }));
      });
    });
    new import_obsidian2.Setting(this.containerEl).setName("Note count color").setDesc(
      "Color of the note count badge (top)."
    ).addColorPicker((picker) => {
      picker.setValue(plugin.options.hubBadgeNoteColor || "#e05252");
      picker.onChange(async (value) => {
        await plugin.writeOptions(() => ({ hubBadgeNoteColor: value }));
      });
    });
    new import_obsidian2.Setting(this.containerEl).setName("To-do count color").setDesc(
      "Color of the unfinished to-do count badge (shown below the note count)."
    ).addColorPicker((picker) => {
      picker.setValue(plugin.options.hubBadgeTodoColor || "#e8964a");
      picker.onChange(async (value) => {
        await plugin.writeOptions(() => ({ hubBadgeTodoColor: value }));
      });
    });
  }