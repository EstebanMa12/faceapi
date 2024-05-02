
const elVideo = document.getElementById('video')

navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)

const registeredDescriptors = []; // Array para almacenar descriptores faciales registrados

// Función para generar un identificador único
const generateUniqueID = () => {
    return uuidv4(); // Generar un identificador único
}

const registerFace = async (descriptor) => {
    // Verificar si el descriptor es lo suficientemente único
    const isUnique = registeredDescriptors.every((registeredDescriptor) => {
        // Calcular la distancia euclidiana entre el descriptor registrado y el nuevo descriptor
        const distance = faceapi.euclideanDistance(descriptor, registeredDescriptor);
        // Establecer un umbral para determinar la unicidad
        return distance > 0.6; // Por ejemplo, si la distancia es mayor a 0.6, considerar único
    });

    if (isUnique) {
        // Asignar un identificador único a la persona registrada
        const id = generateUniqueID(); // Función para generar un identificador único

        // Almacenar el descriptor facial y su identificador único en la base de datos
        registeredDescriptors.push({ id, descriptor });

        // Aquí puedes realizar la inserción en tu base de datos
        // Ejemplo: insertIntoDatabase(id, descriptor);

        return id; // Devolver el identificador único de la persona registrada
    }

    return null; // Devolver null si la persona ya está registrada
};

const cargarCamera = () => {
    navigator.getMedia(
        {
            video: true,
            audio: false
        },
        stream => elVideo.srcObject = stream,
        console.error
    )
}

// Cargar Modelos
Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
]).then(cargarCamera)

elVideo.addEventListener('play', async () => {
    // creamos el canvas con los elementos de la face api
    const canvas = faceapi.createCanvasFromMedia(elVideo)
    // lo añadimos al body
    document.body.append(canvas)

    // tamaño del canvas
    const displaySize = { 
        width: elVideo.width, 
        height: elVideo.height }
    faceapi.matchDimensions(canvas, displaySize)

    setInterval(async () => {
        // hacer las detecciones de cara
        const detections = await faceapi.detectAllFaces(elVideo)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors()

        const filteredDetections = detections.filter(detection => detection.detection.score > 0.5)  

        // ponerlas en su sitio
        const resizedDetections = faceapi.resizeResults(filteredDetections, displaySize)

        // limpiar el canvas
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

        // dibujar las líneas
        faceapi.draw.drawDetections(canvas, resizedDetections)

        resizedDetections.forEach(detection => {
            const box = detection.detection.box
            new faceapi.draw.DrawBox(box, {
                label: Math.round(detection.age) + ' años ' + detection.gender
            }).draw(canvas)
        })

        // Extracción de descriptores faciales del video 
        const descriptor = await faceapi.computeFaceDescriptor(elVideo, resizedDetections[0].landmarks)
        // console.log(descriptor)

        // Registro de la persona en la base de datos
        const id = await registerFace(descriptor);
        if (id) {
            console.log(`Persona registrada con ID: ${id}`);
        } else {
            console.log('Persona ya registrada');
        }


    },100)
})