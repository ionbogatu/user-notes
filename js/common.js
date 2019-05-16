function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();

    window.fb.auth.signInWithPopup(provider).then(async function (result) {
        createUserIfNotExist();
        $('.nav').toggle();
    }).catch(function(error) {
    	console.log(error);
    });
}

function facebookLogin() {
    var provider = new firebase.auth.FacebookAuthProvider();

    window.fb.auth.signInWithPopup(provider).then(function (result) {
        createUserIfNotExist();
        $('.nav').toggle();
    }).catch(function(error) {
        console.log(error);
    });
}

function logout() {
    window.fb.auth.signOut().then(function () {
        $('.nav').show();
        $('.nav-login').hide();
    }, function (error) {
        console.log(error);
    });
}

function createUserIfNotExist() {
    var db = window.fb.firestore;

    const email = window.fb.auth.currentUser.email;
    const userProfileCollection = db.collection("UserProfile");
    userProfileCollection.where("email", "==", email).get()
        .then(async function (result) {
            if (result.docs.length === 0) {
                await userProfileCollection.add({
                    email: email
                });

                window.location.reload();
            }
        })
        .catch(function (error) {
            $('.table-wrapper').addClass('d-none');
            $('.error').removeClass('d-none');
            $('.error').html('<p class="alert alert-danger">' + window.i18n['en']['could-not-get-user'] + '</p>');
            console.error(error);
        });
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function showMessage(message, alertClass) {
	if (alertClass === 'alert-danger') {
	    $('.table-wrapper').addClass('d-none');
	}

    if ($('.table-wrapper-2').length === 1) {
    	$('.table-wrapper-2').closest('.container').addClass('d-none');
    }

    $('.message').removeClass('d-none');
    $('.message').html('<p class="text-center alert ' + alertClass + '">' + message + '</p>');
}

function hideMessage() {
    $('.table-wrapper').removeClass('d-none');

    if ($('.table-wrapper-2').length === 1) {
        $('.table-wrapper-2').closest('.container').removeClass('d-none');
    }

    $('.message').addClass('d-none');
    $('.message').html('');
}

function hasEmptyRows(highlight = false) {
    var empty = false;

    $('.table-wrapper table tbody tr input[type="text"]').each(function() {
        if(!$(this).val()){
            if (highlight) {
                $(this).addClass("error");
            }
            empty = true;
        } else{
            if (highlight) {
                $(this).removeClass("error");
            }
        }
    });

    return empty;
}

function showLoader() {
    $(".loader").addClass('loader--show');
}

function hideLoader() {
    $(".loader").removeClass('loader--show');
}

var firebaseConfig = {
    apiKey: "AIzaSyBOthBwcREmRXm2OwHDoIQqbzdERufUowE",
    authDomain: "user-notes-d5283.firebaseapp.com",
    databaseURL: "https://user-notes-d5283.firebaseio.com",
    projectId: "user-notes-d5283",
    storageBucket: "user-notes-d5283.appspot.com",
    messagingSenderId: "688290206555",
    appId: "1:688290206555:web:5ecc4a6ba1a7c77d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

window.fb = {};

window.fb.firestore = firebase.firestore();
window.fb.auth = firebase.auth();

window.i18n = {
    en: {
        "could-not-get-user": "Could not get the user",
        "could-not-get-notes": "Could not get notes",
        "add": "Add",
        "edit": "Edit",
        "delete": "Delete",
        "no-data-available": "No data available",
        "please-login": "Please login",
        "note-deleted": "Note deleted",
        "your-link-is": "Your link is",
        "could-not-retreive-last-insert-id": "Could not retreive last insert id",
        "sample-note": "Sample Note",
        "the-record-was-deleted": "The record was deleted",
        "record-does-not-exist": 'Record does not exist',
        "could-not-update-total-visits": "Could not update total visits",
        "could-not-get-the-note": "Could not get the note",
        "note-saved": "Note saved",
        "could-not-find-the-note-to-update": "Could not find the note to update"
    }
};