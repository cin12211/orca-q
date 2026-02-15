export const copyRowsToClipboard = (rows: Record<string, any>[]) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  // Prepare text to copy
  let clipboardText = ''; // Header row

  // Add row data
  rows.forEach((row, index) => {
    const rowData = Object.entries(row)
      .map(([_, value]) => {
        return `${value}`;
      })
      .join('\t');

    clipboardText += rowData;
    if (index < rows.length - 1) {
      clipboardText += '\n'; // Add newline between rows
    }
  });

  // Copy to clipboard
  navigator.clipboard.writeText(clipboardText).catch(err => {
    console.error('Failed to copy: ', err);
  });
};
