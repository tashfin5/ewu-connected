import React, { useState, useRef, useEffect } from 'react';

// Helper to parse mentions for the highlighter
const renderHighlighter = (text) => {
  if (!text) return null;
  const parts = text.split(/(@\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const match = part.match(/@\[(.*?)\]\((.*?)\)/);
    if (match) {
      return (
        <span key={i} className="text-blue-600 dark:text-blue-400 font-bold bg-blue-100/50 dark:bg-blue-900/30 rounded px-0.5">
          @{match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const MentionInput = ({ 
  value, 
  onChange, 
  onKeyDown,
  placeholder, 
  className, 
  fetchSuggestions, 
  inputRef,
  singleLine = false,
  inputClassName = "" 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const internalRef = useRef(null);
  const ref = inputRef || internalRef;
  const highlighterRef = useRef(null);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(e, newValue);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    
    // Match an '@' preceded by start-of-string or whitespace
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    
    if (match) {
      const matchText = match[1];
      setQuery(matchText);
      setMentionStartPos(cursorPosition - matchText.length - 1);
      
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

  const handleSelectMention = (suggestion) => {
    const textBeforeMention = value.substring(0, mentionStartPos);
    // Add trailing space
    const mentionText = `@[${suggestion.display}](${suggestion.id}) `;
    const textAfterCursor = value.substring(ref.current.selectionStart);
    
    // Determine prefix space if needed
    const prefix = textBeforeMention.length > 0 && !textBeforeMention.endsWith(' ') && !textBeforeMention.endsWith('\n') ? ' ' : '';
    const newValue = textBeforeMention + prefix + mentionText + textAfterCursor;
    
    onChange({ target: { value: newValue } }, newValue);
    
    setShowDropdown(false);
    setQuery('');
    
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        const newCursorPos = textBeforeMention.length + prefix.length + mentionText.length;
        ref.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
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
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleScroll = (e) => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = e.target.scrollTop;
      highlighterRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const Component = singleLine ? 'input' : 'textarea';
  
  return (
    <div className={`relative ${className}`}>
      {/* Highlighter overlay */}
      <div 
        ref={highlighterRef}
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden ${inputClassName}`}
        style={{ 
          color: 'transparent',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          letterSpacing: 'inherit',
          // Need word-break for single lines so it matches input exactly
          wordBreak: singleLine ? 'normal' : 'break-word',
          whiteSpace: singleLine ? 'pre' : 'pre-wrap'
        }}
      >
        {renderHighlighter(value)}
        {value?.endsWith('\n') ? <br /> : null}
        {!value && placeholder ? <span className="text-slate-400 dark:text-zinc-500">{placeholder}</span> : null}
      </div>

      <Component
        ref={ref}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        className={`w-full h-full bg-transparent border-none outline-none resize-none caret-blue-500 dark:caret-blue-400 text-transparent ${inputClassName}`}
        rows={singleLine ? undefined : 4}
        type={singleLine ? "text" : undefined}
        spellCheck="false"
        style={{ color: 'transparent' }} // Make text transparent so highlighter shows through
      />
      
      {showDropdown && suggestions.length > 0 && (
        <div className={`absolute z-50 ${singleLine ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-64 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl custom-scrollbar`}>
          {suggestions.map((suggestion, index) => (
            <div 
              key={suggestion.id}
              onClick={() => handleSelectMention(suggestion)}
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
