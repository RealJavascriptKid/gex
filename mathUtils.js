// mathUtils.js

function normPdf(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }


  function sortByProperty(arr, key, dir = 'asc') {
    return arr.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      
      // Handle numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        if(dir === 'desc')
          return valB - valA;
        return valA - valB;
      }
      
      // Default to string comparison
      if(dir === 'desc')
        return String(valB).localeCompare(String(valA));

      return String(valA).localeCompare(String(valB));
    });
  }
  
  module.exports = { normPdf,sortByProperty };
  