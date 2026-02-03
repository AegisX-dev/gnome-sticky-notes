/* extension.js
 *
 * Sticky Notes GNOME Shell Extension
 * A panel-based sticky note manager with persistence.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * StickyNotesIndicator - Panel button with popup for managing notes
 */
const StickyNotesIndicator = GObject.registerClass(
class StickyNotesIndicator extends PanelMenu.Button {
    _init(extensionPath) {
        super._init(0.0, 'Sticky Notes');

        // Enable focus on the button itself
        this.can_focus = true;

        this._extensionPath = extensionPath;
        this._notes = [];
        this._currentNoteId = null;
        this._currentView = 'list'; // 'list' or 'editor'

        // Panel icon
        this.add_child(new St.Icon({
            icon_name: 'accessories-text-editor-symbolic',
            style_class: 'system-status-icon',
        }));

        // Master container with fixed width
        this._container = new St.Bin({
            style_class: 'sticky-notes-container',
            width: 400,
            x_expand: false,
            y_expand: true,
            can_focus: true,
            reactive: true,
        });
        this.menu.box.add_child(this._container);

        // Ensure menu can receive focus (property assignment, not function)
        this.menu.sensitive = true;
        this.menu.box.can_focus = true;

        // Load notes and initialize UI
        this._loadNotes();

        // Auto-save on menu close
        this.menu.connect('menu-state-changed', (_menu, state) => {
            if (!state) {
                this._saveNotes();
            }
        });
    }

    /**
     * Load notes from JSON file
     */
    _loadNotes() {
        const notesFile = Gio.File.new_for_path(
            GLib.build_filenamev([this._extensionPath, 'notes.json'])
        );

        try {
            const [success, contents] = notesFile.load_contents(null);
            if (success) {
                const decoder = new TextDecoder('utf-8');
                const jsonString = decoder.decode(contents);
                this._notes = JSON.parse(jsonString);
            }
        } catch (e) {
            // File doesn't exist or is invalid - will create default note
            this._notes = [];
        }

        // If no notes, create a default one
        if (this._notes.length === 0) {
            const defaultNote = {
                id: GLib.uuid_string_random(),
                title: 'New Note',
                content: '',
            };
            this._notes.push(defaultNote);
            this._currentNoteId = defaultNote.id;
            this._showEditorView();
        } else {
            this._showListView();
        }
    }

    /**
     * Save notes to JSON file
     */
    _saveNotes() {
        const notesFile = Gio.File.new_for_path(
            GLib.build_filenamev([this._extensionPath, 'notes.json'])
        );

        try {
            const jsonString = JSON.stringify(this._notes, null, 2);
            const encoder = new TextEncoder();
            const contents = encoder.encode(jsonString);
            notesFile.replace_contents(
                contents,
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );
        } catch (e) {
            log(`Sticky Notes: Error saving notes: ${e.message}`);
        }
    }

    /**
     * Show the list view with all note titles
     */
    _showListView() {
        this._currentView = 'list';
        this._container.set_child(null);

        const listBox = new St.BoxLayout({
            vertical: true,
            style_class: 'sticky-notes-list',
            x_expand: true,
        });

        // Note title buttons
        for (const note of this._notes) {
            const noteButton = new St.Button({
                style_class: 'sticky-notes-item',
                x_expand: true,
            });

            const buttonContent = new St.BoxLayout({
                x_expand: true,
            });

            const titleLabel = new St.Label({
                text: note.title || 'Untitled',
                style_class: 'sticky-notes-item-title',
                x_expand: true,
                x_align: Clutter.ActorAlign.START,
            });
            buttonContent.add_child(titleLabel);

            // Delete button
            const deleteBtn = new St.Button({
                style_class: 'sticky-notes-delete-btn',
                child: new St.Icon({
                    icon_name: 'edit-delete-symbolic',
                    icon_size: 14,
                }),
            });
            deleteBtn.connect('clicked', () => {
                this._deleteNote(note.id);
            });
            buttonContent.add_child(deleteBtn);

            noteButton.set_child(buttonContent);
            noteButton.connect('clicked', () => {
                this._currentNoteId = note.id;
                this._showEditorView();
            });
            listBox.add_child(noteButton);
        }

        // Add Note button
        const addButton = new St.Button({
            style_class: 'sticky-notes-add-btn',
            label: '+ Add Note',
            x_expand: true,
        });
        addButton.connect('clicked', () => {
            this._addNote();
        });
        listBox.add_child(addButton);

        this._container.set_child(listBox);
    }

    /**
     * Show the editor view for a specific note
     */
    _showEditorView() {
        this._currentView = 'editor';
        this._container.set_child(null);

        const note = this._notes.find(n => n.id === this._currentNoteId);
        if (!note) {
            this._showListView();
            return;
        }

        const editorBox = new St.BoxLayout({
            vertical: true,
            style_class: 'sticky-notes-editor',
            x_expand: true,
            can_focus: true,
            reactive: true,
        });

        // Back button
        const backButton = new St.Button({
            style_class: 'sticky-notes-back-btn',
            x_align: Clutter.ActorAlign.START,
            can_focus: true,
            reactive: true,
        });
        const backContent = new St.BoxLayout({});
        backContent.add_child(new St.Icon({
            icon_name: 'go-previous-symbolic',
            icon_size: 16,
        }));
        backContent.add_child(new St.Label({
            text: ' Back',
            y_align: Clutter.ActorAlign.CENTER,
        }));
        backButton.set_child(backContent);
        backButton.connect('clicked', () => {
            this._saveCurrentNote();
            this._showListView();
        });
        editorBox.add_child(backButton);

        // Title entry
        const titleEntry = new St.Entry({
            style_class: 'sticky-notes-title-entry',
            hint_text: 'Note title...',
            text: note.title,
            x_expand: true,
            can_focus: true,
            reactive: true,
        });
        titleEntry.get_clutter_text().connect('text-changed', () => {
            note.title = titleEntry.get_text();
        });
        editorBox.add_child(titleEntry);

        // ScrollView for content with height constraint
        const scrollView = new St.ScrollView({
            style_class: 'sticky-notes-content-scroll',
            x_expand: true,
            y_expand: true,
            hscrollbar_policy: 2, // Gtk.PolicyType.NEVER
            vscrollbar_policy: 1, // Gtk.PolicyType.AUTOMATIC
            overlay_scrollbars: true,
        });

        // BoxLayout wrapper (required - St.Entry is not StScrollable)
        const contentBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            reactive: true,
        });

        // Content entry (multi-line)
        const contentEntry = new St.Entry({
            style_class: 'sticky-notes-content-entry',
            hint_text: 'Write your note here...',
            text: note.content,
            x_expand: true,
            y_expand: true,
            can_focus: true,
            reactive: true,
        });

        // Enable multi-line behavior and ensure editable
        const clutterText = contentEntry.get_clutter_text();
        clutterText.set_single_line_mode(false);
        clutterText.set_activatable(false);
        clutterText.set_line_wrap(true);
        clutterText.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
        clutterText.set_editable(true);
        clutterText.set_selectable(true);

        clutterText.connect('text-changed', () => {
            note.content = contentEntry.get_text();
        });

        // Click-to-focus for content entry
        contentEntry.connect('button-press-event', () => {
            contentEntry.grab_key_focus();
            return Clutter.EVENT_PROPAGATE;
        });

        // Nest: Entry -> BoxLayout -> ScrollView -> EditorBox
        contentBox.add_child(contentEntry);
        scrollView.set_child(contentBox);
        editorBox.add_child(scrollView);

        this._container.set_child(editorBox);

        // Store references for saving
        this._titleEntry = titleEntry;
        this._contentEntry = contentEntry;

        // Grab focus for title entry after a short delay to ensure widget is ready
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            titleEntry.grab_key_focus();
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Save the currently edited note
     */
    _saveCurrentNote() {
        if (!this._currentNoteId) return;

        const note = this._notes.find(n => n.id === this._currentNoteId);
        if (note && this._titleEntry && this._contentEntry) {
            note.title = this._titleEntry.get_text();
            note.content = this._contentEntry.get_text();
        }
    }

    /**
     * Add a new note
     */
    _addNote() {
        const newNote = {
            id: GLib.uuid_string_random(),
            title: 'New Note',
            content: '',
        };
        this._notes.push(newNote);
        this._currentNoteId = newNote.id;
        this._showEditorView();
    }

    /**
     * Delete a note by ID
     */
    _deleteNote(noteId) {
        this._notes = this._notes.filter(n => n.id !== noteId);
        
        // If we deleted all notes, create a new one
        if (this._notes.length === 0) {
            const defaultNote = {
                id: GLib.uuid_string_random(),
                title: 'New Note',
                content: '',
            };
            this._notes.push(defaultNote);
        }
        
        this._showListView();
    }

    /**
     * Clean up on destroy
     */
    destroy() {
        this._saveNotes();
        super.destroy();
    }
});

/**
 * Main Extension Class
 */
export default class StickyNotesExtension extends Extension {
    enable() {
        this._indicator = new StickyNotesIndicator(this.path);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
