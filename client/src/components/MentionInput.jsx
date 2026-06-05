import React, { useState, useRef, useEffect, useCallback } from 'react';


const markupToHtml = (markup) => {
  if (!markup) return '';
  // Avoid rendering HTML that user typed by escaping it first
  const escaped = markup
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Now replace the mention pattern with HTML
  const parts = escaped.split(/(@\[.*?\]\(.*?\))/g);
  return parts.map(part => {
    const match = part.match(/@\[(.*?)\]\((.*?)\)/);
    if (match) {
      return `<strong class="text-blue-600 dark:text-blue-400 font-bold bg-blue-100/50 dark:bg-blue-900/30 rounded px-0.5 mx-0.5 select-all" data-id="${match[2]}" contenteditable="false">@${match[1]}</strong>`;
    }
    return part;
  }).join('');
};

const htmlToMarkup = (html) => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const parseNode = (node) => {
    let result = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        // Replace non-breaking spaces with regular spaces
        result += child.textContent.replace(/\u00a0/g, ' ');
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName.toLowerCase() === 'strong' && child.hasAttribute('data-id')) {
          const name = child.textContent.replace(/^@/, '');
          const id = child.getAttribute('data-id');
          result += `@[${name}](${id})`;
        } else if (child.tagName.toLowerCase() === 'br') {
          result += '\n';
        } else {
          result += parseNode(child);
        }
      }
    }
    return result;
  };
  
  return parseNode(div);
};

const MentionInput = ({ 
  value, 
  onChange, 
  onKeyDown,
  className = '', 
  inputClassName = '',
  placeholder = 'Type @ to mention someone...',
  singleLine = false,
  fetchSuggestions,
  autoFocus = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const contentEditableRef = useRef(null);
  const htmlRef = useRef(markupToHtml(value || ''));
  const lastEmittedMarkupRef = useRef(value || '');

  // Sync incoming value
  useEffect(() => {
    if (value === lastEmittedMarkupRef.current) return; // Prevent DOM updates while typing!
    
    const newHtml = markupToHtml(value || '');
    if (newHtml !== htmlRef.current) {
      htmlRef.current = newHtml;
      lastEmittedMarkupRef.current = value || '';
      // Update DOM only if it genuinely changed externally
      if (contentEditableRef.current && contentEditableRef.current.innerHTML !== newHtml) {
        contentEditableRef.current.innerHTML = newHtml;
      }
    }
  }, [value]);

  // Handle autoFocus
  useEffect(() => {
    if (autoFocus && contentEditableRef.current) {
      contentEditableRef.current.focus();
      if (window.getSelection && document.createRange && contentEditableRef.current.childNodes.length > 0) {
        try {
          const range = document.createRange();
          range.selectNodeContents(contentEditableRef.current);
          range.collapse(false); // false means collapse to end
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {
          console.error("Auto focus error:", e);
        }
      }
    }
  }, [autoFocus]);

  const checkMentionTrigger = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      setShowDropdown(false);
      return;
    }
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    if (node.nodeType !== Node.TEXT_NODE) {
      setShowDropdown(false);
      return;
    }
    
    const textBeforeCursor = node.textContent.substring(0, range.startOffset);
    // Match @ followed by non-whitespace at the end of the text
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    
    if (match) {
      const matchText = match[1];
      setQuery(matchText);
      
      if (fetchSuggestions) {
        fetchSuggestions(matchText, (results) => {
          setSuggestions(results || []);
          setShowDropdown(results && results.length > 0);
          setFocusedIndex(0);
        });
      }
    } else {
      setShowDropdown(false);
    }
  };

  const handleChange = (e) => {
    const newHtml = e.target.innerHTML;
    htmlRef.current = newHtml;
    
    const newMarkup = htmlToMarkup(newHtml);
    lastEmittedMarkupRef.current = newMarkup;
    onChange({ target: { value: newMarkup } }, newMarkup);
    
    checkMentionTrigger();
  };

  const handleSelectMention = (suggestion) => {
    if (!contentEditableRef.current) return;
    
    // Focus the editor
    contentEditableRef.current.focus();
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCursor = node.textContent.substring(0, range.startOffset);
      const match = textBeforeCursor.match(/(?:^|\s)(@[^\s]*)$/);
      
      if (match) {
        // Delete the "@query" text
        const mentionText = match[1];
        range.setStart(node, range.startOffset - mentionText.length);
        range.deleteContents();
      }
    }
    
    // Insert the mention HTML
    const mentionHtml = `<strong class="text-blue-600 dark:text-blue-400 font-bold bg-blue-100/50 dark:bg-blue-900/30 rounded px-0.5 mx-0.5 select-all" data-id="${suggestion.id}" contenteditable="false">@${suggestion.display}</strong>&nbsp;`;
    
    document.execCommand('insertHTML', false, mentionHtml);
    
    setShowDropdown(false);
    setQuery('');
    
    // Trigger onChange to bubble up the new markup
    if (contentEditableRef.current) {
      const finalHtml = contentEditableRef.current.innerHTML;
      htmlRef.current = finalHtml;
      const finalMarkup = htmlToMarkup(finalHtml);
      lastEmittedMarkupRef.current = finalMarkup;
      onChange({ target: { value: finalMarkup } }, finalMarkup);
    }
  };

  const handleKeyDown = (e) => {
    if (showDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[focusedIndex]) {
          handleSelectMention(suggestions[focusedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        return;
      }
    }

    if (singleLine && e.key === 'Enter' && !e.shiftKey && !showDropdown) {
      e.preventDefault();
      if (onKeyDown) onKeyDown(e);
      return;
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        contentEditable
        suppressContentEditableWarning
        ref={contentEditableRef}
        onInput={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={checkMentionTrigger}
        onMouseUp={checkMentionTrigger}
        className={`w-full h-full bg-transparent border-none outline-none resize-none cursor-text ${inputClassName} ${!value ? 'empty-editor' : ''}`}
        data-placeholder={placeholder}
        style={{
          minHeight: singleLine ? 'auto' : '100px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowY: 'auto'
        }}
      />
      
      {/* CSS for Placeholder */}
      <style dangerouslySetInnerHTML={{__html: `
        .empty-editor:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8; /* slate-400 */
          pointer-events: none;
          display: block; /* For Firefox */
        }
        .dark .empty-editor:empty:before {
          color: #71717a; /* zinc-500 */
        }
        /* Hide the annoying br that contenteditable adds sometimes */
        .empty-editor:empty > br {
          display: none;
        }
      `}} />

      {showDropdown && suggestions.length > 0 && (
        <div className={`absolute z-50 ${singleLine ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-64 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl custom-scrollbar`}>
          {suggestions.map((suggestion, index) => (
            <div 
              key={suggestion.id}
              onMouseDown={(e) => {
                e.preventDefault(); // Crucial: prevents the contentEditable from losing focus and wiping the text selection!
                handleSelectMention(suggestion);
              }}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                focusedIndex === index 
                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <img 
                src={suggestion.profilePicture || `https://ui-avatars.com/api/?name=${suggestion.display}`} 
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-zinc-700" 
                alt="" 
              />
              <span className={`text-sm font-bold ${focusedIndex === index ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                {suggestion.display}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
