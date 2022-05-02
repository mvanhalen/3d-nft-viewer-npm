export const name = 'd3d-space-viewer';
let THREE, loader, OrbitControls, XRControllerModelFactory, VRButton;

class Item {

    constructor(config){
        let defaults = {
            modelUrl: '',
            modelsRoute: 'models',
            nftsRoute: 'nfts'            
        };
    
        this.config = {
            ...defaults,
            ...config
        };
        
        THREE = this.config.three;
        this.loader = this.config.loader;
        this.scene = this.config.scene;
        this.height = this.config.height;
        this.width = this.config.width;
        this.depth = this.config.depth;
        this.modelURL = this.config.modelUrl;
        this.mixer = null;
        this.action = null;

    }

    placeModel = (pos, modelUrl) =>{

        let that = this;

        this.fetchModel(modelUrl)
        .then((model)=>{
            console.log('loaded: ',modelUrl);
            console.log(model);
            this.mesh = model;

          //  that.setScale(model);

         //   that.rotateItem();
            that.addToScene(model);
            that.positionItem(model, pos);

        }).catch((err=>{
            console.log( err);
        }))
    
    }

    place = (pos) =>{

        let that = this;

        this.fetchModelURL()
        .then((modelURL)=>{
            that.placeModel(pos,modelURL);
        });
    }

    centerMeshInScene = (gltfScene) =>{
        let firstMesh = null;

        if(gltfScene.children.length === 1){
            firstMesh = gltfScene.children[0];
            firstMesh.geometry.center();
            return firstMesh;            
        } else {
            gltfScene.traverse( c => {

                if ( c.isMesh ) {

                    firstMesh = c;
                    firstMesh.geometry.center();
                    return firstMesh;  
                }

            } );
        }


    }
    
    fetchModelURL = async() =>{
        let that = this;

        return new Promise((resolve,reject)=>{
            // fetch from config if available
            if(this.config.modelUrl!==''){
                console.log('config url: ',this.config.modelUrl);
                resolve(this.config.modelUrl);
            } else {
                let url = this.config.nftsRoute+that.config.nftPostHashHex;
                    console.log('fetchModelURL from: '+url);

                fetch(url,{ method: "post"})
                .then(response => response.json())
                .then((data)=>{ 

                    if(data !== undefined){
                        console.log('that.config.nftPostHashHex: '+that.config.nftPostHashHex);
                        console.log('that.config.modelsRoute: '+that.config.modelsRoute);
                        console.log('modelUrl: '+that.config.modelUrl);

                        let fullUrl = that.config.modelsRoute+'/'+that.config.nftPostHashHex+data.modelUrl;
                        resolve(fullUrl);
                    } else {
                        reject();
                    }
                });
            }
        })
        
    }

    fetchModel = async(modelURL) =>{
        
        let that = this;

        return new Promise((resolve,reject)=>{

            console.log('create container:',that.config.width, that.config.height,that.config.depth);
            const geometry = new THREE.BoxGeometry(that.config.width, that.config.height,that.config.depth);
            
            if(!that.config.color){
                that.config.color = 0xfffff;
            };
            
            const material = new THREE.MeshPhongMaterial({
                color: that.config.color,
                opacity: 0,
                transparent: true
            });

            let boxMesh = new THREE.Mesh( geometry, material );
            this.scene.add(boxMesh);
            let sceneBounds = new THREE.Box3().setFromObject( boxMesh );
            let meshBounds = null;

            console.log('loader attempting load of: ',modelURL);
            that.loader.load(modelURL, (model)=> {

                let gltfMesh = null;

                if(model.scene){
                   gltfMesh = model.scene;
                } else {
                    gltfMesh = model;
                };


                if(gltfMesh.animations){
                    console.log('anmiations found');
                    if(gltfMesh.animations[1]){
                        console.log('gltfMesh.animations');
                        console.log(gltfMesh.animations)

                        that.mixer = new THREE.AnimationMixer( gltfMesh );
                        that.action = that.mixer.clipAction( gltfMesh.animations[ 1 ] );
                        that.action.play();
                        console.log('animations playeing');
                    } else {
                        console.log('animations empty');
                    }
                } else {
                    console.log('no animations: ');
                    console.log(gltfMesh);
                }

      /*      if(that.shouldBeCentered(model.scene.children)){
                    let h = that.getImportedObjectSize(model.scene);
                    let heightOffset = h/2;                    
                    model.scene.children[0].position.setX(0);
                    model.scene.children[0].position.setZ(0);
                    model.scene.children[0].position.setY(heightOffset);                       
                    that.centerMeshInScene(model.scene);                
                };
*/
                let meshBounds = new THREE.Box3().setFromObject( gltfMesh );


                // Calculate side lengths of scene (cube) bounding box
                let lengthSceneBounds = {
                  x: Math.abs(sceneBounds.max.x - sceneBounds.min.x),
                  y: Math.abs(sceneBounds.max.y - sceneBounds.min.y),
                  z: Math.abs(sceneBounds.max.z - sceneBounds.min.z),
                };   

                // Calculate side lengths of glb-model bounding box
                let lengthMeshBounds = {
                  x: Math.abs(meshBounds.max.x - meshBounds.min.x),
                  y: Math.abs(meshBounds.max.y - meshBounds.min.y),
                  z: Math.abs(meshBounds.max.z - meshBounds.min.z),
                };

                // Calculate length ratios
                let lengthRatios = [
                  (lengthSceneBounds.x / lengthMeshBounds.x),
                  (lengthSceneBounds.y / lengthMeshBounds.y),
                  (lengthSceneBounds.z / lengthMeshBounds.z),
                ];

                let minRatio = Math.min(...lengthRatios);
                boxMesh.add(gltfMesh);
                // Use smallest ratio to scale the model
                gltfMesh.scale.set(minRatio, minRatio, minRatio);
                gltfMesh.position.set(0,0,0);        
                resolve(boxMesh);
            });

        })
      
    }

    shouldBeCentered = (children) =>{

        if(children.length>1){
            return false;// dont center      
        };        
    
        if(!children[0].isMesh){
            return false; // dont center         
        };
        let mesh = children[0];
        if(mesh.position.x!=0){
            return true;
        };
    
        if(mesh.position.z!=0){
            return true;
        };

        return false;
    }

    getImportedObjectSize = (obj) =>{
        let box = new THREE.Box3().setFromObject(obj);
        let center = new THREE.Vector3();
        let size = new THREE.Vector3();
        let max = box.max;
        let min = box.min;
        let d = max.z - min.z;
        let w = max.x - min.x;
        let h = max.y - min.y;

        return h;
    }

    setScale = (model) =>{

        //create a box which is the desired size of the nft

        let lengthSceneBounds = {
          x: 2,
          y: 2,
          z: 2,
        };

        let meshBounds = this.getMeshBounds(model);
        
        let lengthMeshBounds = {
          x: Math.abs(meshBounds.max.x - meshBounds.min.x),
          y: Math.abs(meshBounds.max.y - meshBounds.min.y),
          z: Math.abs(meshBounds.max.z - meshBounds.min.z),
        }

        let lengthRatios = [
          (lengthSceneBounds.x / lengthMeshBounds.x),
          (lengthSceneBounds.y / lengthMeshBounds.y),
          (lengthSceneBounds.z / lengthMeshBounds.z),
        ];
        
        let minRatio = Math.min(...lengthRatios);

        model.scale.set(minRatio, minRatio, minRatio);

    }

    getMeshBounds = (model) => {
        let that = this;
        let meshBounds = null;

        model.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.geometry.computeBoundingBox()
                meshBounds = child.geometry.boundingBox;
                console.log(meshBounds);
            }
        });
        return meshBounds;
    }

    positionItem = (model, posVector) =>{
        model.position.copy(posVector);
    }

    rotateItem = () =>{

    }

    addToScene = (model) =>{
        this.scene.add(model);
        console.log('model added to scene');
        console.log(this.scene);
    }

}

 class D3DInventory {
    
    constructor(config) {

        let defaults = {
                    items: []
                };
        
        this.config = {
            ...defaults,
            ...config
        };

        THREE = this.config.three;
        this.scene = this.config.scene;
        this.loader = this.config.loader;

        this.items = [];

        this.load();
      
    }

    load = () =>{
        this.initItems(this.config.items);
    }

    initItems = (itemList)=>{

        let that = this;
        console.log('initItems');
        console.log(itemList);
        itemList.forEach((itemData)=>{
            itemData.three = THREE;
            itemData.scene = this.scene;
            itemData.loader = this.loader;
            let item = new Item(itemData);
            that.items.push(item);

        })
    }

    getItems = () =>{
        return this.items;
    }


 }
export {D3DInventory, Item};