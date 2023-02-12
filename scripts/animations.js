let g_inRot = 1;
let g_basicSquareDemo;


function matrixToString(matrix) {
    let result = "[";
    for (let i = 0; i < matrix.length; i++) {
        result += "[";
        for (let j = 0; j < matrix[0].length; j++) {
            result += matrix[i][j].toFixed(2);
            result += (j == matrix[0].length - 1)? "": ",";
        }
        result += "]"
        result += (i == matrix.length - 1)? "": ",";
    }
    result += "]";
    return result;
}

class AnimatedCanvas {
    constructor(canvasIdStub) {
        this.canvasIdStub = canvasIdStub;
        this.transformationState = {
            transformaionMat: getIdentityMatrix(),
        };
        this.transformationMatrix = getIdentityMatrix();
        this.keypointTimePassed = 0;
        this.totalTimePassed = 0;
        this.keypointIndex = 0;
        this.lastTimeStamp = Date.now();
    }
}

let keypoints_demo1 = [
    {
        matrix:
            [[1.5, 0, 0],
                [0, 1.5, 0],
            [0, 0, 1]],
        time: 500,
    },
    {
        matrix:
            [[1.5, 0, 0],
                [0, 1.5, 0],
                [0, 0, 1]],
        time: 1800,
    },
    {
        matrix:
            [[1,0,0],
                [0,1,0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[1,0,0],
                [0,1,0],
                [0, 0, 1]],
        time: 1800,
    },
    {
        matrix:
            [[0,-1,0],
                [1,0,0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[0,-1,0],
                [1,0,0],
                [0, 0, 1]],
        time: 1800,
    },
    {
        matrix:
            [[-1,0,0],
                [0,-1,0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[-1,0,0],
                [0,-1,0],
                [0, 0, 1]],
        time: 1800,
    },
    {
        matrix:
            [[0,1,0],
                [-1,0,0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[0,1,0],
                [-1,0,0],
                [0, 0, 1]],
        time: 1800,
    },

    {
        matrix:
            [[.7, .2, 0],
                [-1.5, .7, 0],
                [0, 0, 1]],
        time: 700,
    },
    {
        matrix:
            [[.7, .2, 0],
                [-1.5, .7, 0],
                [0, 0, 1]],
        time: 1800,
    },
    {
        matrix:
            [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]],
        time: 500,
    },
    {
        matrix:
            [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]],
        time: 1800,
    },

];

let keypoints_demoRis = [
    {
        matrix:
            [[1, 0, 0],
                [0, 1 / 1, 0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[1, 0, 0],
                [0, 1 / 1, 0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[2, 0, 0],
                [0, 1 / 2, 0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[2, 0, 0],
                [0, 1 / 2, 0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[4, -2, 0],
                [0, 1 / 4, 0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[4, -2, 0],
                [0, 1 / 4, 0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [[1, -2, 0],
                [0, 1 / 1, 0],
                [0, 0, 1]],
        time: 800,
    },
    {
        matrix:
            [
                [1, -2, 0],
                [0, 1 / 1, 0],
                [0, 0, 1]
            ],
        time: 800,
    },
    {
        matrix:
            [
                [1/4, 2, 0],
                [0, 4, 0],
                [0, 0, 1]
            ],
        time: 800,
    },
    {
        matrix:
            [
                [1/4, 2, 0],
                [0, 4, 0],
                [0, 0, 1]
            ],
        time: 800,
    },
    {
        matrix:
            [
                [.5, 0, 0],
                [0, 1 / .5, 0],
                [0, 0, 1]
            ],
        time: 800,
    },
    {
        matrix:
            [
                [.5, 0, 0],
                [0, 1 / .5, 0],
                [0, 0, 1]
            ],
        time: 800,
    },
];

function inBetweenValue(from, to, percentage) {
    return ((to-from)*percentage)+from;
}

function getMidMatrix(from, to, percentage) {
    return [
        [inBetweenValue(from[0][0], to[0][0], percentage),
            inBetweenValue(from[0][1], to[0][1], percentage), 0],
        [inBetweenValue(from[1][0], to[1][0], percentage),
            inBetweenValue(from[1][1], to[1][1], percentage), 0],
        [0, 0, 1]
    ]
}

function fillDemoVals(prefix, matrix, valHack) {
    valHack = (valHack == undefined)? 1 : valHack;
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            const idx = ((matrix.length * j)+i) + 1;//+1 because not zero indexed
            $("#" + prefix + "" + idx).text((matrix[i][j] * valHack).toFixed(2));
        }
    }
}

function cutMatrix(matrix, cutWidth, cutHeight) {
    let result = [];
    for (let i = 0; i < cutHeight; i++) {
        let line = [];
        for (let j = 0; j < cutWidth; j++) {
            line.push(matrix[i][j]);
        }
        result.push(line);
    }
    return result;
}

function drawGrid(w, h, ctx) {
    ctx.canvas.width  = w;
    ctx.canvas.height = h;

    const data = '<svg width="500px" height="500px" xmlns="http://www.w3.org/2000/svg"> \
        <defs> \
            <pattern id="smallGrid" width="4" height="4" patternUnits="userSpaceOnUse"> \
                <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgba(0,0,0,.05)" stroke-width="1" /> \
            </pattern> \
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"> \
                <rect width="40" height="40" fill="url(#smallGrid)" /> \
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,.1)" stroke-width="1" /> \
            </pattern> \
        </defs> \
        <rect width="100%" height="100%" fill="url(#grid)" /> \
    </svg>';

    const DOMURL = window.URL || window.webkitURL || window;

    const img = new Image();
    const svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
    const url = DOMURL.createObjectURL(svg);

    img.onload = function () {
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);
    }
    img.src = url;
}

function addSquareDemo() {
    g_basicSquareDemo = new AnimatedCanvas("basicSquareDemo");
    g_basicSquareDemo.draw = function() {
        const animationDifference = Date.now() - g_basicSquareDemo.lastTimeStamp;
        g_basicSquareDemo.lastTimeStamp = Date.now();
        if (g_basicSquareDemo.paused) {
            setTimeout(g_basicSquareDemo.draw, 0);
            return;
        }
        g_basicSquareDemo.keypointTimePassed += animationDifference;
        const canvasObj = getCleanUICanvas(g_basicSquareDemo.canvasIdStub);

        if (g_basicSquareDemo.keypointTimePassed > keypoints_demo1[g_basicSquareDemo.keypointIndex].time) {
            //Change keypoint
            g_basicSquareDemo.previousTransformationMatrix = keypoints_demo1[g_basicSquareDemo.keypointIndex].matrix;

            g_basicSquareDemo.keypointTimePassed = 0;
            g_basicSquareDemo.keypointIndex++;
            if (g_basicSquareDemo.keypointIndex >= keypoints_demo1.length) {
                g_basicSquareDemo.keypointIndex = 0;
            }
        }

        g_basicSquareDemo.transformationMatrix = getIdentityMatrix();
        const from = g_basicSquareDemo.previousTransformationMatrix;
        const to = keypoints_demo1[g_basicSquareDemo.keypointIndex].matrix;
        const percentage = g_basicSquareDemo.keypointTimePassed/keypoints_demo1[g_basicSquareDemo.keypointIndex].time;

        g_basicSquareDemo.transformationMatrix = getMidMatrix(from, to, percentage);
        fillDemoVals("abcdDemoV", cutMatrix(g_basicSquareDemo.transformationMatrix, 2, 2));

        // g_basicSquareDemo.transformationMatrix = matrixMultiply(g_basicSquareDemo.transformationMatrix, getTranslateMatrix(200, 200));
        // g_basicSquareDemo.transformationMatrix = matrixMultiply(g_basicSquareDemo.transformationMatrix, getTranslateMatrix(200, 200));
        // g_basicSquareDemo.transformationMatrix = matrixMultiply(g_basicSquareDemo.transformationMatrix, getRotationMatrix(g_inRot));
        let changedShape = applyTransformationMatrixToAllKeypoints(g_basicSquareDemo.shape, g_basicSquareDemo.transformationMatrix);
        fillDemoVals("abcdDemoShapeV", changedShape, (1 / 100) * (1 / .4));

        //center of canvas element
        changedShape = applyTransformationMatrixToAllKeypoints(changedShape, getTranslateMatrix(200, 200));
        drawPolyFull(canvasObj.ctx_ui, changedShape);

        // $("#shapeDemo_transformationMatrix").html(matrixToString(g_basicSquareDemo.transformationMatrix));
        // $("#shapeDemo_outputShape").html(matrixToString(changedShape));
        g_inRot += 1;

        setTimeout(g_basicSquareDemo.draw, 0);
    };
    g_basicSquareDemo.shape = applyTransformationMatrixToAllKeypoints([[100, 100], [-100, 100], [-100, -100], [100, -100]], getScaleMatrix(.4, .4));
    g_basicSquareDemo.paused = false;
    g_basicSquareDemo.previousTransformationMatrix = getIdentityMatrix();

    const basicSquareDemo = getCleanCanvas("basicSquareDemo");
    drawGrid(401, 401, basicSquareDemo.ctx)
    $( document ).ready(function() {
        g_basicSquareDemo.draw();
    });
}
addSquareDemo();

function sumupshape(inputShape) {
    let result = 0;
    for (let i = 0; i < inputShape.length; i++) {
        result += inputShape[i][0] ** 2 + inputShape[i][1] ** 2;
    }
    return result;
}

//returns [sum x**2, sum y**2, sum x*y]
function get3SumOfVals(inputShape) {
    let result = [0, 0, 0];
    for (let i = 0; i < inputShape.length; i++) {
        result[0] += inputShape[i][0] ** 2;
        result[1] += inputShape[i][1] ** 2;
        result[2] += inputShape[i][0] * inputShape[i][1];
    }
    return result;

}

const shape1 = [[27.39884094784378, 3.587232075810334], [26.386657488225467, 4.28522200986049], [25.35255790278046, 4.912605076948637], [25.294756959841095, 5.573272877895789], [24.223666185191803, 6.092347893091755], [23.140572749051273, 6.539251096148206], [22.049202559584444, 6.913819128894374], [21.923572568259658, 7.457982405404891], [20.817766386918777, 7.7217924130652875], [19.71363217597593, 7.913469997059735], [19.554537638846455, 8.375514082369705], [18.45223105721189, 8.457117790217097], [18.274931897197746, 8.874808435795586], [18.08316354973303, 9.28605698406838], [16.994212062150893, 9.220890829240943], [15.92512038947271, 9.087232075810334], [15.727370005564381, 9.416343982375537], [15.51825424594935, 9.738354013988527], [15.29802788596831, 10.052869851027424], [15.066959237517779, 10.359508304392506], [14.059285379033497, 10.015108172675696], [13.830289202617791, 10.278538139398961], [13.592238951230229, 10.533815780400289], [12.65076628197474, 10.061290278858138], [12.421016405073544, 10.275535505106944], [12.183929435022606, 10.48163206388108], [11.324132750448996, 9.891318104664151], [11.101122966183482, 10.059368030809992], [10.872384175609739, 10.219532656250749], [10.638195061709382, 10.37161684506168], [10.39884094784378, 10.51543530608592], [10.154613450130853, 10.650812818681743], [9.905810122156424, 10.777584446203718], [9.652734092450089, 10.895595736951236], [9.395693695171019, 11.004702912344555], [9.135002094449135, 11.104773042097577], [8.870976902843438, 11.195684206171563], [8.603939794379755, 11.277325643316999], [8.334216112641059, 11.349597886018273], [8.0621344743858, 11.412412881680666], [7.788026369179249, 11.465694099907978], [7.512225755524412, 11.509376625742789], [7.235068653985024, 11.543407238756572], [6.95689273779675, 11.567744477888937], [6.678036921463843, 11.582358691963009], [6.39884094784378, 11.587232075810334], [6.119644974223718, 11.582358691963009], [5.840789157890811, 11.567744477888937], [5.562613241702536, 11.543407238756572], [5.285456140163149, 11.509376625742789], [5.009655526508311, 11.465694099907978], [4.73554742130176, 11.412412881680666], [4.463465783046502, 11.349597886018273], [3.9181047454908082, 12.238587339255332], [3.6176879984691652, 12.146740722466717], [3.3206596579127563, 12.044465662883482], [3.0273816071006365, 11.931886766911333], [2.7382111601616828, 11.809141194593849], [2.4535006267420556, 11.676378492502892], [1.7041253199849393, 12.416708004399595], [1.3988409478437802, 12.247486113654816], [1.0996483055117778, 12.067713037374517], [0.8069119131363323, 11.877607801360853], [0.5209884249191532, 11.677402019559906], [-0.3734352807383914, 12.255350365484333], [-0.6718227587081174, 12.013720950119023], [-0.9615957221037092, 11.761825156061747], [-1.9370594976641655, 12.219309679874073], [-2.233236656219958, 11.92313252131828], [-2.5188969578850333, 11.616799352116686], [-3.5597368127028517, 11.943471001735304], [-4.6333096026503995, 12.206492730369462], [-4.927396973405621, 11.816225607904812], [-6.036722640481997, 11.975125627871506], [-6.321880494502494, 11.536021039308338], [-6.591540108922942, 11.087232075810334], [-7.728320537899037, 11.09877708038448], [-8.880657839242161, 11.039541571224703], [-10.04497728972325, 10.90849165117453], [-11.217652288924995, 10.704757350712526], [-12.395011467874326, 10.42763494232372], [-13.573345894354446, 10.076588957684436], [-14.748916362798923, 9.651253903784266], [-15.917960756504044, 9.15143567460251], [-17.076701469767215, 8.577112655436395], [-19.206160630473562, 8.102084695150609], [-20.338396908178254, 7.344905801732466], [-21.447772122468052, 6.514029047304689], [-22.530516509691154, 5.610169814389849], [-24.582274689747834, 4.669116473588076], [-25.60115905215622, 3.587232075810334], [-26.581056343786003, 2.4355486846275767], [-27.51833676099028, 1.2155119685102136], [-28.40942539004601, -0.07126413855760916], [-28.26054145811071, -1.2838264577924292], [-29.054238160595617, -2.6641023201992766], [-28.814472678572713, -3.8975887936287563], [-30.47239665064393, -5.605799956976739], [-31.09036519375121, -7.162624801052544], [-30.692363187667212, -8.464430704812997], [-27.43009340044881, -8.725493083913761], [-25.12541010742666, -9.14939210033043], [-22.834613696719828, -9.428340502614901], [-20.56498044113141, -9.563902327862081], [-18.32369165220615, -9.55797168219442], [-16.11781955055187, -9.412767924189666], [-15.650409552223095, -10.190668794252872], [-14.327098366032516, -10.392590510958286], [-13.017566917155193, -10.51961397920877], [-10.937395631504216, -9.957320381354009], [-9.688092357654625, -9.911307727606925], [-8.464055561704242, -9.79538005136692], [-7.987955058929117, -10.305935333369575], [-6.799668090877134, -10.080224130623918], [-5.645509966615748, -9.789374782782886], [-5.17133602651387, -10.201567900331156], [-4.067404132692303, -9.808950735504027], [-3.5935083411280857, -10.166056828563939], [-2.5482455076881365, -9.677369085070495], [-2.0798672798874236, -9.981537462692359], [-1.6011590521562198, -10.269174384740836], [-0.6432324939444811, -9.656981817073557], [-0.17672625399242747, -9.894678618677261], [0.2977913017069511, -10.115949788828857], [0.7797420466052074, -10.32052574269133], [1.6105589412844097, -9.56846461519234], [2.072603026594379, -9.727559152321817], [2.539917966405824, -9.87043166732633], [3.0119344094485427, -9.996908092053559], [3.488077276395245, -10.106834334462746], [3.9677664605067093, -10.200076466360542], [4.450417534402675, -10.276520886571461], [4.935442462096603, -10.336074459345582], [5.4222503154260835, -10.37866462782722], [5.910247994008671, -10.404239502456846], [6.39884094784378, -10.412767924189666], [6.8874339016788895, -10.404239502456846], [7.375431580261477, -10.37866462782722], [7.862239433590958, -10.336074459345582], [8.347264361284886, -10.276520886571461], [8.482619079846984, -8.230460960336131], [8.685869546839058, -7.172391532261685], [9.059981799440038, -7.086020913225582], [9.430851861830746, -6.986646579511017], [9.489010891593352, -5.923333087141202], [9.819042381100473, -5.809694132048719], [10.144906882002829, -5.684606469857442], [10.466207378601666, -5.548222500615793], [10.782552415734585, -5.400708387181396], [11.563028138488505, -6.125191445637853], [11.89884094784378, -5.939047365818595], [12.227952854408983, -5.741296981910267], [12.549962886021973, -5.532181222295236], [13.452263975353333, -6.1209718566891524], [13.786778651751604, -5.868896967470391], [14.75507987376875, -6.371345684736298], [15.097538830508995, -6.0736506553958804], [15.429399763810721, -5.764185328592049], [15.750258352246163, -5.443326740156607], [16.802868504527396, -5.780596413213743], [20.18764092398527, -7.982944898547316], [22.94706677358505, -9.341658906028357], [24.19721482409284, -9.344043474623845], [26.295742689165024, -9.83339760748754], [27.600043351754238, -9.660749530019672], [28.049476042454984, -8.912767924189666], [29.35547836217586, -8.619028556622652], [30.666280197921452, -8.24878888749484], [31.064568304194324, -7.394657287235958], [30.50562116658, -6.152539353003192], [30.83084908827732, -5.305291650657068], [31.126310371517775, -4.4472097779385535], [31.391645042239702, -3.579339175431585], [30.65623410474359, -2.4608153141811613], [29.874383365454776, -1.4026485038157261], [29.049419267124506, -0.4066760105291394], [29.175006528899587, 0.38625075372851825], [28.278322645945934, 1.2876058839219127], [28.345250053559937, 2.052589653439668], [27.38604831524455, 2.8543426450576703]];
const shape1_fixing = [[0.6002157706188539, -0.09675260590836118, 0], [0, 1.6660675193005137, 0], [0, 0, 1]];

const shape2 = [[4.812249305868789, 8.235838262306316], [4.806766749040548, 8.549933732628887], [4.790325758207217, 8.863646526003407], [4.762946364183307, 9.176594431715216], [4.724661924542801, 9.488396170947027], [4.675519082978639, 9.79867186130872], [5.593725313206733, 10.314955170483842], [5.515206568628713, 10.655057218302915], [5.424866265252092, 10.992211820476285], [5.322814468820326, 11.326008206055889], [5.209175513727843, 11.65603969556301], [5.084087851536566, 11.981904196465365], [4.947703882294917, 12.303204693064203], [6.597777861458866, 13.496292023775283], [9.056463198752681, 15.277911704094578], [8.802630362635512, 15.735838262306316], [9.381018844371482, 16.71454649003752], [9.076850466749619, 17.182924717838233], [8.756521215868105, 17.64040229898572], [9.20843211718315, 18.7020833428424], [8.068960395772336, 18.520440017290895], [7.7025665135072074, 18.94192796404812], [8.041025911625752, 20.04503056010924], [7.6214416036717125, 20.46461486806328], [7.856600220328318, 21.612445120899537], [8.025213889912976, 22.79068268156678], [8.125478812381829, 23.99605333444086], [7.567954351718043, 24.41617814980546], [7.55530027875443, 25.645627285962405], [6.410634590532794, 25.196800185434682], [5.812249305868789, 25.55634633799528], [5.671152124372355, 26.777737712343765], [4.5796722416504, 26.211719188289777], [3.9469821673845615, 26.50674741515857], [3.6789877676027913, 27.706699208208647], [2.994672315707845, 27.969383298810328], [2.301606187742891, 28.208025104504543], [1.600633778025724, 28.42233387701131], [0.8926091134616456, 28.612048514102156], [0.17839481304159222, 28.776937877715937], [-0.7147871407925379, 27.931993322550426], [-1.4042886749296315, 28.041199637137453], [-2.0971814287781, 28.12627616967191], [-2.7926212192487867, 28.187119267502823], [-3.4897607600810545, 28.223654802688003], [-4.187750694131211, 28.235838262306316], [-4.850841131478859, 27.22426397566892], [-5.443367221525392, 26.191991166983172], [-6.06926303294901, 26.13723237893535], [-6.553693410452553, 25.070395430912782], [-7.139769714469082, 24.97757006351381], [-7.514337747215251, 23.88619987404698], [-7.816579128126108, 22.790274156446202], [-8.322311031386164, 22.654763701381313], [-8.513988615380612, 21.550629490438467], [-8.976032700690581, 21.39153495330899], [-9.057636408537974, 20.289228371674426], [-9.068590411040674, 19.19838375401767], [-9.009833308811096, 18.12257277159722], [-8.882466321990051, 17.065314190895577], [-9.18775069413121, 16.896092300150798], [-9.486943336463213, 16.7163192238705], [-9.779679728838659, 16.526213987856835], [-10.065603217055838, 16.32600820605589], [-9.728703972062078, 15.32793504476686], [-9.972839181310036, 15.130238250377062], [-10.209926151360975, 14.924141691602927], [-9.745017657803174, 13.990556665015475], [-9.94246909684037, 13.79310522597828], [-10.13290929795042, 13.588883113177218], [-9.550061795964012, 12.73535153011207], [-9.7038259693783, 12.54546858958588], [-9.850869654755911, 12.350335028353555], [-9.991013702016573, 12.15018858660153], [-10.124087367226139, 11.945273111938718], [-10.249928520622348, 11.735838262306316], [-10.368383844143693, 11.522139201807505], [-10.479309018225422, 11.30443628982988], [-10.5825688976295, 11.082994763836837], [-10.678037676098654, 10.85808441621765], [-10.765599039632548, 10.629979265586002], [-10.845146308197286, 10.398957222931017], [-10.916582565699343, 10.165299753025295], [-10.979820778063157, 9.929291531503935], [-11.03478389926778, 9.691220098030584], [-11.081404965216649, 9.451375505974852], [-11.119627175322108, 9.21004996902687], [-11.149403961709169, 8.967537505179905], [-11.170699045949988, 8.724133578515165], [-11.1834864832648, 8.480134739223871], [-11.18775069413121, 8.235838262306316], [-11.1834864832648, 7.991541785388762], [-11.170699045949988, 7.747542946097468], [-11.149403961709169, 7.504139019432728], [-11.119627175322108, 7.261626555585764], [-11.081404965216649, 7.020301018637781], [-11.03478389926778, 6.780456426582049], [-10.979820778063157, 6.542384993108698], [-10.916582565699514, 6.306376771587338], [-10.845146308197286, 6.072719301681616], [-10.765599039632548, 5.841697259026631], [-10.678037676098654, 5.6135921083949825], [-10.5825688976295, 5.388681760775796], [-10.479309018225422, 5.167240234782753], [-10.368383844143693, 4.949537322805128], [-11.115953924406796, 4.235838262306316], [-10.972135463382557, 3.9964841484407145], [-10.820051274571625, 3.762295034540358], [-10.659886649130868, 3.533556243966615], [-10.491836722985028, 3.3105464597011007], [-11.082150682201956, 2.450749775127491], [-10.87605412342782, 2.2136628050765523], [-10.661808897179014, 1.9839129281753571], [-10.43967602826217, 1.7617800592585127], [-10.879056757719837, 0.8043900075323052], [-10.615626790996572, 0.5753938311165996], [-10.34436544738773, 0.3557307262390452], [-10.065603217055838, 0.14566831855674423], [-9.779679728838659, -0.054537463244201945], [-10.016862600696413, -1.0926907954142848], [-9.68775069413121, -1.2904411793226132], [-9.82140944756182, -2.3595328520007968], [-9.886575602389257, -3.448484339582933], [-9.882063697192251, -4.553798144690262], [-9.806849595369783, -5.671919556195348], [-9.66007298734192, -6.799243670268169], [-9.132022604130526, -6.981065998416142], [-8.873585743020158, -8.105610568645346], [-8.784266710524747, -10.199780536937538], [-8.34598451048626, -11.327113752369513], [-7.834362425136817, -12.445124550949998], [-7.249558915252948, -13.550059250007934], [-6.591905349287288, -14.638165331164117], [-5.9316625377342405, -16.703262994189316], [-5.130037105098921, -18.74771406720896], [-4.187750694131211, -20.764161737693684], [-3.1058662963534687, -22.745277375285298], [-1.9555435343193324, -23.686211346008093], [-0.6337829430309228, -25.577906180215194], [0.8224809404316318, -27.41381221238973], [2.584528234879201, -30.171664105169697], [4.3366286293966425, -31.8682133677803], [6.214890816654162, -33.486877967561355], [7.9402929618166525, -34.05967635897909], [8.481946075242035, -30.757478905794983], [8.809014752244224, -27.472481327558086], [8.92348007542546, -24.2155966475309], [8.827821884294025, -20.99761638225729], [8.963383709541205, -18.727983126668875], [8.957453063873544, -16.486694337743614], [8.81224930586879, -14.280822236089335], [8.530311647465595, -12.117316045447723], [8.67368608569592, -10.832025906459876], [8.743524856302969, -9.562535613942742], [9.356801763033133, -9.10039831704168], [9.310789109286048, -7.851095043192089], [9.194861433046043, -6.627058247241706], [9.010758344589703, -5.431617944127936], [9.479705512303042, -4.962670776414598], [9.18885616446201, -3.8085126521532118], [9.60104928201028, -3.334338712051334], [9.20843211718315, -2.230406818229767], [9.565538210243062, -1.7565110266655495], [9.076850466749619, -0.7112481932256003], [9.381018844371482, -0.24286996542488737], [9.66865576641996, 0.23583826230631644], [9.056463198752681, 1.193764820518055], [8.395365954057212, 2.0986422072591893], [6.774794797580142, 3.354998545396853], [6.011271706103344, 4.115165734731363], [5.209175513727843, 4.815636829049623], [5.322814468820326, 5.145668318556744], [5.424866265251836, 5.479464704136348], [5.515206568628713, 5.816619306309718], [5.593725313206704, 6.156721354128791], [5.660326835990844, 6.49935648563698], [4.724661924542801, 6.983280353665606], [4.762946364183307, 7.295082092897417], [4.790325758207217, 7.608029998609226], [4.806766749040548, 7.921742791983746]];
const shape2_fixing = [[1.7848901094643097, 0.15557253328507425, 0], [0, 0.560258581017139, 0], [0, 0, 1]];


let g_basicFullDemo;
let keypoints_basicFull = [
    {
        matrix1:
            [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]],
        matrix2:
            [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]],
        time: 500,
    },
    {
        matrix1:
            [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]],
        matrix2:
            [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]],
        time: 600,
    },
    {
        matrix1: shape1_fixing,
        matrix2: shape2_fixing,
        time: 500,
    },
    {
        matrix1: shape1_fixing,
        matrix2: shape2_fixing,
        time: 1600,
    },
    {
        matrix1:
            [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]],
        matrix2:
            [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]],
        time: 100,
    },
];


const rot1 = 0;
const rot2 = -75;
let g_basicFullDemo2;
let keypoints_basicFull2 = [
    {
        matrix1: shape1_fixing,
        matrix2: shape2_fixing,
        time: 500,
    },
    {
        matrix1: shape1_fixing,
        matrix2: shape2_fixing,
        time: 1600,
    },
    {
        matrix1: matrixMultiply(getRotationMatrix(rot1), shape1_fixing),
        matrix2: matrixMultiply(getRotationMatrix(rot2), shape2_fixing),
        time: 1600,
    },
    {
        matrix1: matrixMultiply(getRotationMatrix(rot1), shape1_fixing),
        matrix2: matrixMultiply(getRotationMatrix(rot2), shape2_fixing),
        time: 1600,
    },
];

const shape1area = calcPolygonArea(shape1);
const shape2area = calcPolygonArea(shape2);
const scaleArea = 2000;
let g_basicFullDemo3;
let keypoints_basicFull3 = [
    {
        matrix1: matrixMultiply(getRotationMatrix(rot1), shape1_fixing),
        matrix2: matrixMultiply(getRotationMatrix(rot2), shape2_fixing),
        time: 1600,
    },
    {
        matrix1: matrixMultiply(getRotationMatrix(rot1), shape1_fixing),
        matrix2: matrixMultiply(getRotationMatrix(rot2), shape2_fixing),
        time: 1600,
    },
    {
        matrix1: matrixMultiply(getScaleMatrix(scaleArea / shape1area, scaleArea / shape1area), matrixMultiply(getRotationMatrix(rot1), shape1_fixing)),
        matrix2: matrixMultiply(getScaleMatrix(scaleArea / shape2area, scaleArea / shape2area), matrixMultiply(getRotationMatrix(rot2), shape2_fixing)),
        time: 1600,
    },
    {
        matrix1: matrixMultiply(getScaleMatrix(scaleArea / shape1area, scaleArea / shape1area), matrixMultiply(getRotationMatrix(rot1), shape1_fixing)),
        matrix2: matrixMultiply(getScaleMatrix(scaleArea / shape2area, scaleArea / shape2area), matrixMultiply(getRotationMatrix(rot2), shape2_fixing)),
        time: 1600,
    },
];

function add3dGraphDemo(shape, scale) {
    let transPt = findCentroid(shape);

    g_viz3dGraphDemo = new AnimatedCanvas();
    g_viz3dGraphDemo.draw = function(a, b, img) {

        const abTransMat = [
            [a, b, 0],
            [0, 1.0 / a, 0],
            [0, 0, 1],
        ];
        const areaScale = Math.sqrt( 4000/(calcPolygonArea(shape)) );

        {
            const canvasObj = getCleanCanvas("viz3dGraphDemo");

            let mat = getIdentityMatrix();
            mat = matrixMultiply(getTranslateMatrix(-transPt[0], -transPt[1]), mat)
            mat = matrixMultiply(abTransMat, mat)
            mat = matrixMultiply(getScaleMatrix(areaScale, areaScale), mat);
            mat = matrixMultiply(getTranslateMatrix(canvasObj.c.width / 2, canvasObj.c.height / 2), mat)

            let changedShape = applyTransformationMatrixToAllKeypoints(shape, mat);
            drawPolyFull(canvasObj.ctx_ui, changedShape);

            if (img != null) {
                drawImageWithTransformations(canvasObj.ctx, img, mat, img.width, img.height)
            }
        }
        {
            const canvasObjImg2 = getCleanCanvas("viz3dGraphDemoImg2");
            const c_shape = applyTransformationMatrixToAllKeypoints(shape, getTranslateMatrix(-transPt[0], -transPt[1]));
            const k1 = get_a(c_shape);
            const k2 = get_b(c_shape);
            const transMat = [
                [k1, k2, 0],
                [0, 1.0 / k1, 0],
                [0, 0, 1],
            ];
            let mat = getIdentityMatrix();
            mat = matrixMultiply(getTranslateMatrix(-transPt[0], -transPt[1]), mat)
            mat = matrixMultiply(transMat, mat)
            mat = matrixMultiply(getScaleMatrix(areaScale, areaScale), mat);
            mat = matrixMultiply(getTranslateMatrix(canvasObjImg2.c.width / 2, canvasObjImg2.c.height / 2), mat)

            let changedShape = applyTransformationMatrixToAllKeypoints(shape, mat);
            drawPolyFull(canvasObjImg2.ctx_ui, changedShape);

            if (img != null) {
                drawImageWithTransformations(canvasObjImg2.ctx, img, mat, img.width, img.height)
            }
        }
    };
    g_viz3dGraphDemo.draw(1, 0);
    return g_viz3dGraphDemo;
}



let g_basicSquareDemoRis;

function addSquareDemoRis() {
    g_basicSquareDemoRis = new AnimatedCanvas("basicSquareDemoRis");
    g_basicSquareDemoRis.draw = function () {
        const animationDifference = Date.now() - g_basicSquareDemoRis.lastTimeStamp;
        g_basicSquareDemoRis.lastTimeStamp = Date.now();
        if (g_basicSquareDemoRis.paused) {
            setTimeout(g_basicSquareDemoRis.draw, 0);
            return;
        }
        g_basicSquareDemoRis.keypointTimePassed += animationDifference;

        const canvasObj = getCleanUICanvas(g_basicSquareDemoRis.canvasIdStub);

        if (g_basicSquareDemoRis.keypointTimePassed > keypoints_demoRis[g_basicSquareDemoRis.keypointIndex].time) {
            //Change keypoint
            g_basicSquareDemoRis.previousTransformationMatrix = keypoints_demoRis[g_basicSquareDemoRis.keypointIndex].matrix;

            g_basicSquareDemoRis.keypointTimePassed = 0;
            g_basicSquareDemoRis.keypointIndex++;
            if (g_basicSquareDemoRis.keypointIndex >= keypoints_demoRis.length) {
                g_basicSquareDemoRis.keypointIndex = 0;
            }
        }

        g_basicSquareDemoRis.transformationMatrix = getIdentityMatrix();
        const from = g_basicSquareDemoRis.previousTransformationMatrix;
        const to = keypoints_demoRis[g_basicSquareDemoRis.keypointIndex].matrix;
        const percentage = g_basicSquareDemoRis.keypointTimePassed / keypoints_demoRis[g_basicSquareDemoRis.keypointIndex].time;

        g_basicSquareDemoRis.transformationMatrix = getMidMatrix(from, to, percentage);

        // fillDemoVals("v3", cutMatrix(g_basicSquareDemoRis.transformationMatrix, 2, 2));

        let changedShape = applyTransformationMatrixToAllKeypoints(g_basicSquareDemoRis.shape, g_basicSquareDemoRis.transformationMatrix);
        fillDemoVals("abDemoV", cutMatrix(g_basicSquareDemoRis.transformationMatrix, 2, 2));
        fillDemoVals("abDemoShapeV", changedShape, (1 / 100) * (1 / .4));

        changedShape = applyTransformationMatrixToAllKeypoints(changedShape, getTranslateMatrix(200, 200));
        drawPolyFull(canvasObj.ctx_ui, changedShape);
        g_inRot += 1;

        setTimeout(g_basicSquareDemoRis.draw, 0);
    };
    g_basicSquareDemoRis.shape = applyTransformationMatrixToAllKeypoints([[100, 100], [-100, 100], [-100, -100], [100, -100]], getScaleMatrix(.4, .4));
    g_basicSquareDemoRis.previousTransformationMatrix = getIdentityMatrix();
    g_basicSquareDemoRis.paused = false;

    const basicSquareDemo = getCleanCanvas("basicSquareDemoRis");
    drawGrid(401, 401, basicSquareDemo.ctx)
    $(document).ready(function () {
        g_basicSquareDemoRis.draw();
    });
}

addSquareDemoRis();




