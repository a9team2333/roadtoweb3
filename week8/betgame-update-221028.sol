// SPDX-License-Identifier: UNLICENSED
pragma solidity ^ 0.8.0;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Casino {
    struct ProposedBet {
        address sideA;
        uint value;
        uint placedAt;
        bool accepted;  
        }    // struct ProposedBet
    struct AcceptedBet {
        address sideB;
        uint startTime;
        uint randomB;
        //增加rev时的时间戳
        uint endTime;
        uint recallTime;
        }   // struct AcceptedBet
    
    //增加时间限制
    uint timeLimit = 60;

    // Proposed bets, keyed by the commitment value
    mapping(uint => ProposedBet) public proposedBet;
    // Accepted bets, also keyed by commitment value
    mapping(uint => AcceptedBet) public acceptedBet;

    event BetProposed (
        uint indexed _commitment,
        uint value
        );
    event BetAccepted (
        uint indexed _commitment,
        address indexed _sideA
        );
    event BetSettled (
        uint indexed _commitment,
        address winner,
        address loser,
        uint value   
        );

    // Called by sideA to start the process
    function proposeBet(uint _commitment) external payable {
        //如果再mapping里的编号不是0，就拒绝，这个思路挺好
        require(proposedBet[_commitment].value == 0,
        "there is already a bet on that commitment");
        require(msg.value > 0,
        "you need to actually bet something");

        proposedBet[_commitment].sideA = msg.sender;
        proposedBet[_commitment].value = msg.value;
        proposedBet[_commitment].placedAt = block.timestamp;
        // accepted is false by default

        emit BetProposed(_commitment, msg.value);
        }  // function proposeBet

     // Called by sideB to continue
    function acceptBet(uint _commitment, uint _random) external payable {
        require(!proposedBet[_commitment].accepted,
            "Bet has already been accepted");
        require(proposedBet[_commitment].sideA != address(0),
            "Nobody made that bet");
        require(msg.value == proposedBet[_commitment].value,
            "Need to bet the same amount as sideA");
        
        acceptedBet[_commitment].sideB = msg.sender;
        //接受赌注时的时间戳
        acceptedBet[_commitment].startTime = block.timestamp;
        acceptedBet[_commitment].randomB = _random;
        proposedBet[_commitment].accepted = true;
        emit BetAccepted(_commitment, proposedBet[_commitment].sideA);
        }   // function acceptBet

     // Called by sideA to reveal their random value and conclude the bet
    function reveal(uint _random) external {
        //增加了一个声明，之前报错是因为这个吗？
        uint _commitment = uint256(keccak256(abi.encodePacked(_random)));
        //reveal时的时间戳
        acceptedBet[_commitment].endTime = block.timestamp;
        require(proposedBet[_commitment].sideA == msg.sender,
        "Not a bet you placed or wrong value");
        require(proposedBet[_commitment].accepted,
        "Bet has not been accepted yet");
        //增加新的判断依据，时间超过timeLimit就无法reveal了
        require(acceptedBet[_commitment].endTime - acceptedBet[_commitment].startTime <= timeLimit,
        "U are too slow");

        address payable _sideA = payable(msg.sender);
        address payable _sideB = payable(acceptedBet[_commitment].sideB);

        uint _agreedRandom = _random ^ acceptedBet[_commitment].randomB;
        uint _value = proposedBet[_commitment].value;

        // Pay and emit an event
        if (_agreedRandom % 2 == 0) {
            _sideA.transfer(2*_value);
            emit BetSettled(_commitment, _sideA, _sideB, _value);
        } else {
            // sideB wins
            _sideB.transfer(2*_value);
            emit BetSettled(_commitment, _sideB, _sideA, _value);     
        }

        // Cleanup
        delete proposedBet[_commitment];
        delete acceptedBet[_commitment];
        }  // function reveal

    function killGame(uint _commitment) external {
        //只有玩家B可以使用
        require(acceptedBet[_commitment].sideB == msg.sender,
        "U are not player");
        //时间超过timeLimit才能使用
        require(acceptedBet[_commitment].endTime - acceptedBet[_commitment].startTime >= timeLimit,
        "not now!");

        address payable _sideB = payable(acceptedBet[_commitment].sideB);
        uint _value = proposedBet[_commitment].value;
        _sideB.transfer(2*_value);

        // Cleanup
        delete proposedBet[_commitment];
        delete acceptedBet[_commitment];
        }

    
    //Helping playerA recall his random, requires front-end collaboration
    //帮助玩家A回忆他的random，需要前端的协作
    function recall(uint _tryNum, uint _commitment) external returns(string memory) {
        //判断是否是玩家A
        require(proposedBet[_commitment].sideA == msg.sender,
        "u are not playerA");
        //三分钟操作一次
        require(block.timestamp - acceptedBet[_commitment].recallTime >= 180,
        "too quickly!");

        uint randomA;
        if (_tryNum >= randomA) {
            return ("big");
        }else{
            return ("little");
        }
        acceptedBet[_commitment].recallTime = block.timestamp;
    }

    function kecca(uint _tryNum) external pure returns (uint ecca) {
        ecca = uint256(keccak256(abi.encodePacked(_tryNum)));  
    }



}   // contract Casino
