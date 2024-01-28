import { uid } from './uid.js';

let db = null; 
let objectStore = null;
let DBOpenRequest = indexedDB.open('WhiskeyDB', 1); // db name, db version

DBOpenRequest.addEventListener('error', err => {
    console.warn('An Error occurred opening the database', err);
});

DBOpenRequest.addEventListener('success', e => {
    db = e.target.result; 
    console.log('success', db);

    // Populate the page with already present data in indexedDB whiskeyStore
    buildList();
});

DBOpenRequest.addEventListener('upgradeneeded', e => {
    db = e.target.result;
    let oldVersion = e.oldVersion;
    let newVersion = e.newVersion || db.version;
    console.log(`DB updated from ${oldVersion} to ${newVersion}`);
    console.log('upgrade', db);

    if( !db.objectStoreNames.contains('whiskeyStore')) {
        objectStore = db.createObjectStore('whiskeyStore', { keyPath: 'id' });
    }
});

/**
 * Creating method for creating transactions due to which we
 * don't need to write the error handler for every transaction 
 * if the action performed in the error handler is same
 */
function createTransaction(storeName, mode) {
    let tx = db.transaction(storeName, mode);
    tx.onerror = err => {
        console.warn('TRANSACTION FAILED, An error occurred', err);
    }
    return tx;
}

const form = document.querySelector('form.whiskeyForm');
const list = document.querySelector('ul.whiskeyList');
const nameInput = document.querySelector('#name');
const countryInput = document.querySelector('#country');
const ageInput = document.querySelector('#age');
const owned = document.querySelector('#owned');

const addBtn = document.querySelector('#addBtn');
const updateBtn = document.querySelector('#updateBtn');
const deleteBtn = document.querySelector('#deleteBtn');
const resetBtn = document.querySelector('#resetBtn');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    addWhiskey();
})

updateBtn.addEventListener('click', updateWhiskey);
deleteBtn.addEventListener('click', deleteWhiskey);
resetBtn.addEventListener('click', resetForm);
list.addEventListener('click', listItemClicked);

function resetForm() {
    nameInput.value = '';
    countryInput.value = '';
    ageInput.value = '';
    owned.checked = false;
}

function buildList() {
  let tx = createTransaction('whiskeyStore', 'readonly');
  tx.oncomplete = e => {
    console.log('TRANSACTION COMPLETE');
  };
  
  let store = tx.objectStore('whiskeyStore');
  let request = store.getAll();
  
  request.onsuccess = (e) => {
    console.log('REQUEST COMPLETE, fetched all objects from object store');
    const req = e.target;
    const data = req.result;

    list.innerHTML = data
      .map((current) => {
        return `<li data-key=${current.id}><span>${current.name} </span> from ${current.country}<br> ${current.age} years old`;
      })
      .join('\n');
  };
                  
  request.onerror = err => {
    console.warn('REQUEST FAILED, An error occurred getting all objects from object store', err);
  }
}

function addWhiskey() {
  if(nameInput.value.trim() === '' || countryInput.value.trim() === '' || ageInput.value.trim() === '') { 
      alert('Please fill all the form fields');
      return;
  }
    
  if(isNaN(ageInput.value)) {
      alert('Please enter a number for years old field');
      return;
  }

  let whiskey = {
      id: uid(),
      name: nameInput.value,
      country: countryInput.value,
      age: parseInt(ageInput.value),
      owned: owned.checked
  }

  let tx = createTransaction('whiskeyStore', 'readwrite');
  tx.oncomplete = e => {
    console.log('TRANSACTION COMPLETE');
    buildList();
    resetForm();
  }

  let store = tx.objectStore('whiskeyStore');
  let request = store.add(whiskey);
  
  request.onsuccess = e => {
    console.log('REQUEST COMPLETE, object was added successfully to object store');
  };

  request.onerror = err => {
    console.warn('REQUEST FAILED, An error occurred adding the object', err);
  }
}

function listItemClicked(e) {
  const li = e.target.closest('[data-key]');
  const id = li.getAttribute('data-key');
  getSingleWhiskey(id, (whiskey) => {
    nameInput.value = whiskey.name;
    countryInput.value = whiskey.country;
    ageInput.value = whiskey.age.toString();
    owned.checked = whiskey.owned;
    form.setAttribute('data-key', whiskey.id);
  });
}

function updateWhiskey() {
  const id = form.getAttribute('data-key');
  if(!id) return;
  const whiskey = {
    id,
    name: nameInput.value,
    country: countryInput.value,
    age: parseInt(ageInput.value),
    owned: owned.checked
  }
  
  let tx = createTransaction('whiskeyStore', 'readwrite');
  tx.oncomplete = e => {
    console.log('TRANSACTION COMPLETE');
    buildList();
  };

  let store = tx.objectStore('whiskeyStore');
  let request = store.put(whiskey);

  request.onsuccess = e => {
    console.log('REQUEST COMPLETE, Successfully updated the selected object in the object store');
    const req = e.target;
    const data = req.result;
  };

  request.onerror = err => {
    console.warn('REQUEST FAILED, An error occurred updating the selected object in the object store', err);
  }
}

function deleteWhiskey() {
  const id = form.getAttribute('data-key');
  if(!id) return;
  let tx = createTransaction('whiskeyStore', 'readwrite');
  tx.oncomplete = e =>{
    console.log('TRANSACTION COMPLETE');
    resetForm();
    buildList();
  };

  let store = tx.objectStore('whiskeyStore');
  let request = store.delete(id);

  request.onsuccess = e => {
    console.log('REQUEST COMPLETE, Successfully deleted the selected object from the object store');
  };

  request.onerror = err => {
    console.warn('REQUEST FAILED, Error occurred while deleting a single object from the object store');
  }
}

function getSingleWhiskey(id, callback) {
  let whiskey = null; 
  let tx = createTransaction('whiskeyStore', 'readonly');
  tx.oncomplete = e => {
    console.log('TRANSACTION COMPLETE');
    if(callback) callback(whiskey);
  };

  let store = tx.objectStore('whiskeyStore');
  let request = store.get(id);

  request.onsuccess = e => {
    console.log('REQUEST COMPLETE, successfully fetched a single whiskey from the object store');
    const req = e.target;
    const data = req.result;
    whiskey = data;
  };

  request.onerror = err => {
    console.warn('REQUEST FAILED, An error occurred fetching a single whiskey from the object store', err);
  };
}
