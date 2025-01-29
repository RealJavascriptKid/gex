const yahooFinance = require("yahoo-finance2").default;
const { normPdf,sortByProperty } = require("./mathUtils"); // A helper function for normal distribution PDF
const fs = require('fs');

let tickers = require('./tickers') 

// Black-Scholes Gamma Calculation
function calculateGamma(S, K, T, r, sigma) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
  return normPdf(d1) / (S * sigma * Math.sqrt(T));
}

// Fetch options chain data for a ticker
async function fetchOptionsChain(ticker) {
  try {
    const result = await yahooFinance.options(ticker);
    if (!result || !result.options || result.options.length === 0) {
      throw new Error("No options data found.");
    }
    
    return result.options.flatMap(optionChain => {
      const expirationDate = optionChain.expirationDate;
      return [
        ...optionChain.calls.map(call => ({
          strike: call.strike,
          openInterest: call.openInterest || 0,
          price: call.lastPrice,
          impliedVolatility: call.impliedVolatility || 0.2, // Default IV if not available
          expiration: expirationDate,
        })),
        ...optionChain.puts.map(put => ({
          strike: put.strike,
          openInterest: put.openInterest || 0,
          price: put.lastPrice,
          impliedVolatility: put.impliedVolatility || 0.2,
          expiration: expirationDate,
        }))
      ];
    });
  } catch (error) {
    console.error("Error fetching options chain:", error.message);
    return [];
  }
}

// Calculate gamma exposure for each strike
function calculateGammaExposure(options, underlyingPrice, riskFreeRate = 0.01) {
  const gammaExposureData = [];
  const currentTime = new Date();

  options.forEach(option => {
    const T = Math.max((new Date(option.expiration) - currentTime) / (365 * 24 * 60 * 60 * 1000), 1 / 365); // Time to expiration in years
    const gamma = calculateGamma(underlyingPrice, option.strike, T, riskFreeRate, option.impliedVolatility);
    const notional = option.strike * 100;
    const gammaExposure = gamma * option.openInterest * notional;
    gammaExposureData.push({ strike: option.strike, gammaExposure,...option });
  });

  return gammaExposureData;
}

async function runTicker(tickerName) {
    console.log(`Fetching options chain and stock price for ${tickerName}...`);

    try {
      const [options, stock] = await Promise.all([
        fetchOptionsChain(tickerName),
        yahooFinance.quote(tickerName)
      ]);
  
      if (!options.length) {
        console.log("No options data found.");
        return;
      }
  
      let gammaExposureData = calculateGammaExposure(options, stock.regularMarketPrice);
  
      if (!gammaExposureData.length) {
        console.log("No gamma exposure data available.");
        return;
      }
  
     
      gammaExposureData = sortByProperty(gammaExposureData,'gammaExposure','desc')
  
      fs.writeFileSync(`${tickerName}.json`, JSON.stringify(gammaExposureData, null, 2));

    } catch (error) {
      console.error("Error:", error.message);
    }
}

// Main function
(async function main() {
  
     for(let ticker of tickers){
        await runTicker(ticker)
     }
 
})();
