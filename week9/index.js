// top of index.js
const BigNumber = require('bignumber.js');
const qs = require('qs');
const Web3 = require('web3');
const ethers = require('ethers');


let  currentTrade = {};
let  currentSelectSide;
let  tokens;
const INFURA_ID = 'I30MpzHwtjw6gmcYt2z6FUW1OPbS6AfK'
// 连接以太坊主网
const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth_goerli")
const providerETH = new ethers.providers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${INFURA_ID}`)

//在实际调用模态之前加载令牌列表
async function init(){
    await listAvailableTokens();
}
//...



async function listAvailableTokens(){
    console.log("initializing");
    let response = await fetch('https://tokens.coingecko.com/uniswap/all.json');
    let tokenListJSON = await response.json();
    console.log("listing available tokens: ", tokenListJSON);
    tokens = tokenListJSON.tokens
    console.log("tokens:", tokens);
  
    // Create a token list for the modal
    let parent = document.getElementById("token_list");
    // Loop through all the tokens inside the token list JSON object
    for (const i in tokens){
      // Create a row for each token in the list
      let div = document.createElement("div");
      div.className = "token_row";
      // For each row, display the token image and symbol
      let html = `
      <img class="token_list_img" src="${tokens[i].logoURI}">
        <span class="token_list_text">${tokens[i].symbol}</span>
        `;
      div.innerHTML = html;
      div.onclick = () => {
        selectToken(tokens[i]);
      };
      parent.appendChild(div);
    }
  }

//需要在全局层面定义ETHprice，不然函数里赋值，后面拿不到
var ETHprice
//调用预言机查询币价
//从chainlink里复制代码，得到lastestrounddata的数据。
//里面有时间、价格等等，需要用.answer提取，这个数据还是bignumber。js里用toString()转换
const aggregatorV3InterfaceABI = [{ "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "description", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint80", "name": "_roundId", "type": "uint80" }], "name": "getRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "latestRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "version", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }]
const addr = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e"
const priceFeed = new ethers.Contract(addr, aggregatorV3InterfaceABI, provider)
priceFeed.latestRoundData()
    .then((roundData) => {
        ETHprice = roundData.answer.toString()/10e7// Do something with roundData
        console.log("Latest price", ETHprice)
    })


function  selectToken(token) {
    // When a token is selected, automatically close the modal
    closeModal();
    // Track which side of the trade we are on - from/to
    currentTrade[currentSelectSide] = token;
    // Log the selected token
    console.log("currentTrade:" , currentTrade);
    renderInterface();

}


function renderInterface(){
    if (currentTrade.from){
        console.log(currentTrade.from)
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
    }
    if (currentTrade.to){
        console.log(currentTrade.to)
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    }
}

//连接小狐狸钱包
async  function  connect() {
    /** MetaMask injects a global API into websites visited by its users at `window.ethereum`. This API allows websites to request users' Ethereum accounts, read data from blockchains the user is connected to, and suggest that the user sign messages and transactions. The presence of the provider object indicates an Ethereum user. Read more: https://ethereum.stackexchange.com/a/68294/85979**/
    
    // Check if MetaMask is installed, if it is, try connecting to an account
        if (typeof  window.ethereum !== "undefined") {
            try {
                console.log("connecting");
                // Requests that the user provides an Ethereum address to be identified by. The request causes a MetaMask popup to appear. Read more: https://docs.metamask.io/guide/rpc-api.html#eth-requestaccounts
                await  ethereum.request({ method:  "eth_requestAccounts" });
            } catch (error) {
            console.log(error);
            }
            // If connected, change button to "Connected"
            document.getElementById("login_button").innerHTML = "Connected";
            // If connected, enable "Swap" button
            document.getElementById("swap_button").disabled = false;
            } 
            // Ask user to install MetaMask if it's not detected 
            else {
            document.getElementById("login_button").innerHTML =
                "Please install MetaMask";
            }
        }
    // Call the connect function when the login_button is clicked

//开关币种列表
function  openModal(side){
    // Store whether the user has selected a token on the from or to side
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block";
}
function  closeModal(){
    document.getElementById("token_modal").style.display = "none";
    }

//获取币的兑换价格
async function getPrice(){
    console.log("Getting Price");
    //如果选币栏是空的，就会直接false的相反（true），然后不执行后面的代码。很巧妙
    //如果选币栏是有东西的，本身为true，！之后变为false，继续执行后半段代码
    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);
  
    const params = {
        sellToken: currentTrade.from.address,
        buyToken: currentTrade.to.address,
        sellAmount: amount,
    }
  
    // Fetch the swap price.
    const response = await fetch(`https://api.0x.org/swap/v1/price?${qs.stringify(params)}`);
    
    swapPriceJSON = await response.json();
    console.log("Price: ", swapPriceJSON);
 //   console.log("ethersssssss ", ethers.utils.formatEther(swapPriceJSON.estimatedGas));  

 //ethers给的gasPrice也是bignumber，在后面用toString转换了
    console.log('gasnum-view',ethers.utils.formatEther(swapPriceJSON.estimatedGas));
    const gasPrice = await providerETH.getGasPrice();
    console.log('gasprice-view',gasPrice.toString());
    console.log('ethprice-view',ETHprice);

    let dollers = ethers.utils.formatEther(swapPriceJSON.estimatedGas)*gasPrice.toString()*ETHprice;


    document.getElementById("to_amount").value = swapPriceJSON.buyAmount / (10 ** currentTrade.to.decimals);
//!!!把gas改为美元显示，0x接口给的gas数量(wei)转换成eth单位后*gasPrice（来自ethers）*ETHPrice（来自chainlink）
    document.getElementById("gas_estimate").innerHTML = ethers.utils.formatEther(swapPriceJSON.estimatedGas)*gasPrice.toString()*ETHprice;

}


async function getQuote(account){
    console.log("Getting Quote");
  
    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);
  
    const params = {
        sellToken: currentTrade.from.address,
        buyToken: currentTrade.to.address,
        sellAmount: amount,
        takerAddress: account,
    }


    
    // Fetch the swap quote.
    const response = await fetch(`https://api.0x.org/swap/v1/quote?${qs.stringify(params)}`);
    
    swapQuoteJSON = await response.json();
    console.log("Quote: ", swapQuoteJSON);
    
    document.getElementById("to_amount").value = swapQuoteJSON.buyAmount / (10 ** currentTrade.to.decimals);
    document.getElementById("gas_estimate").innerHTML = swapQuoteJSON.estimatedGas;
  
    return swapQuoteJSON;
}


async function trySwap(){
    const erc20abi= [{ "inputs": [ { "internalType": "string", "name": "name", "type": "string" }, { "internalType": "string", "name": "symbol", "type": "string" }, { "internalType": "uint256", "name": "max_supply", "type": "uint256" } ], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" } ], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" } ], "name": "Transfer", "type": "event" }, { "inputs": [ { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" } ], "name": "allowance", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "approve", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "account", "type": "address" } ], "name": "balanceOf", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "account", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "burnFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [ { "internalType": "uint8", "name": "", "type": "uint8" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "subtractedValue", "type": "uint256" } ], "name": "decreaseAllowance", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "addedValue", "type": "uint256" } ], "name": "increaseAllowance", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "transfer", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "transferFrom", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }]
    console.log("trying swap");
  
    // Only work if MetaMask is connect
    // Connecting to Ethereum: Metamask
    const web3 = new Web3(Web3.givenProvider);
  
    // The address, if any, of the most recently used account that the caller is permitted to access
    let accounts = await ethereum.request({ method: "eth_accounts" });
    let takerAddress = accounts[0];
    
    console.log("takerAddress: ", takerAddress);
  

 //!!!设置授权，这里需要改为不是最大，参考：https://docs.0x.org/0x-api-swap/advanced-topics/how-to-set-your-token-allowances 
 //把授权数量改为，输入栏里的token数量即可，即swapPriceJSON.sellAmount
 // Set Token Allowance
    // Set up approval amount
    const fromTokenAddress = currentTrade.from.address;

    const limitApproval = swapPriceJSON.sellAmount;
    const maxApproval =  new BigNumber(2).pow(256).minus(1);
    console.log("approval amount: ", limitApproval , maxApproval);
    const ERC20TokenContract = new web3.eth.Contract(erc20abi, fromTokenAddress);
    console.log("setup ERC20TokenContract: ", ERC20TokenContract);
  
    // Grant the allowance target an allowance to spend our tokens.
    const tx = await ERC20TokenContract.methods.approve(
        swapPriceJSON.allowanceTarget,
        limitApproval,
    )
    .send({ from: takerAddress })
    .then(tx => {
        console.log("tx: ", tx)
    });


    // Perform the swap
    const swapQuoteJSON = await getQuote(takerAddress);

    const receipt = await web3.eth.sendTransaction(swapQuoteJSON);
    console.log("receipt: ", receipt);
}

init();


document.getElementById("login_button").onclick = connect;
document.getElementById("from_token_select").onclick = () => {
    openModal("from");
    };
document.getElementById("to_token_select").onclick = () => {
    openModal("to");
    };
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_amount").onclick = getPrice;
document.getElementById("swap_button").onclick = trySwap;





