import React, { useState, useRef, useEffect } from 'react';

const MentionInput = ({ 
  value, 
  onChange, 
  onKeyDown,
  placeholder, 
  className, 
  fetchSuggestions, 
  inputRef,
  singleLine = false 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const internalRef = useRef(null);
  const ref = inputRef || internalRef;

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(e, newValue);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    
    // Match an '@' preceded by start-of-string or whitespace, followed by any characters except whitespace
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    
    if (match) {
      const matchText = match[1];
      setQuery(matchText);
      setMentionStartPos(cursorPosition - matchText.length - 1);
      
      // Fetch suggestions
      if (fetchSuggestions) {
        fetchSuggestions(matchText, (results) => {
          setSuggestions(results);
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
    // Include a trailing space after the mention
    const mentionText = ` @[${suggestion.display}](${suggestion.id}) `;
    const textAfterCursor = value.substring(ref.current.selectionStart);
    
    const newValue = textBeforeMention + mentionText + textAfterCursor;
    
    // Create a fake event object to pass to onChange
    onChange({ target: { value: newValue } }, newValue);
    
    setShowDropdown(false);
    setQuery('');
    
    // Focus the input back
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        // Set cursor after the inserted mention
        const newCursorPos = textBeforeMention.length + mentionText.length;
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
    
    // Pass event to parent
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const Component = singleLine ? 'input' : 'textarea';
  
  return (
    <div className={`relative ${className}`}>
      <Component
        ref={ref}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full h-full bg-transparent border-none outline-none resize-none"
        rows={singleLine ? undefined : 4}
        type={singleLine ? "text" : undefined}
      />
      
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl custom-scrollbar">
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
