// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract DummyVRF {
    uint256[20] PLAY_VALS = [
        1805388630361663123383723030321434837234747686332383102784847220245518539162,
        19826474746195237632535830192742542373544550628330123559836844048563803787249,
        5885692572390682075272780654153645606460821097559415201993782914931847006166,
        20487307186784671215756009470326970429112398775178920694737829727229358658035,
        21262254762724460515205725040990478706614363779931325417879868512001002551448,
        10248664682216371118223025569992179990579720510063637306752561058177296463860,
        17612832894570093001560406106134800618842797469423513476050400661066715327958,
        4822601301876272332063293436383895002035312485827586373419022164711400953788,
        17076254317552681956533876301048164528884798343625062086287916363485861908103,
        17023612385024845815530094840262410584732507818365752611550656926308526557055,
        17870129347582719726408570978740828490693551251325748765990726738757016367530,
        12031246363635068636533532762295071139694298674670005100400366124300863519643,
        6860449741714687955174395246454934930018593232120298603496974054589920019365,
        7032594350144806209341761266699450712450719141697058719725189008583954019245,
        12329186943598401537751783691954613848784856563742372741385055204723009888094,
        5985743205119193086240273397962106896223847028341145916774799091108350885278,
        21561198524067026648996321571803335175183841439384271675574314346097277979557,
        11053812850247480171714453584666944364883487778533085962448849406281763727364,
        8853615892004739248301911492504354270979465178652091900727587971731505885626,
        11146017350875199963721940307936436613051410031268524273908573452631649515732
    ];

    modifier validIndex(uint256 index) {
        require(index >= 0 && index < PLAY_VALS.length, "Index out of bounds");
        _;
    }

    function getRandValue(
        uint256 index
    ) external view validIndex(index) returns (uint256) {
        return PLAY_VALS[index];
    }
}