function showError(error) {
    $('.table-wrapper').addClass('d-none');
    $('.table-wrapper-2').closest('.container').addClass('d-none');
    $('.error').removeClass('d-none');
    $('.error').html('<p class="alert alert-danger">' + error + '</p>');
}

async function getOrCreateLastInsertId() {
    return new Promise(function(resolve) {
        var db = firebase.firestore();

        db.collection("Settings").doc("lastInsertId").get()
            .then(function(result) {
                if (!result.data()) {
                    db.collection("Settings").doc("lastInsertId").set({value: 0})
                        .then(function() {
                            resolve(0);
                        });
                } else {
                    resolve(result.data().value)
                }
            })
            .catch(function(error) {
                showError(error);
                resolve(null);
            });
    })

    if (!insertDoc.data()) {
        await db.collection("Settings").doc("lastInsertId").set({value: 0});
        var id = (await db.collection("Settings").doc("lastInsertId").get()).data().value;
    } else {
        var id = insertDoc.data().value;
    }
}

/* async function reloadNotes() {
    var id = await getOrCreateLastInsertId();

    if (id) {
        var masterNotesCollection = await db.collection("MasterNotes").get();

        var loginUserClass = firebase.auth().currentUser ? '' : 'd-none';

        var actions = '<a class="add" title="Add" data-toggle="tooltip"><i class="material-icons">&#xE03B;</i></a>' +
            '<a class="edit ' + loginUserClass + '" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a>' +
            '<a class="delete ' + loginUserClass + '" title="Delete" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>';

        $(".table-wrapper").removeClass("d-none");
        $(".error").addClass("d-none");

        $(".table-wrapper table tbody tr").remove();

        for (var note of masterNotesCollection.docs) {
            if (!note.data().status || note.data().status !== "delete") {
                var index = $(".table-wrapper table tbody tr:last-child").index();
                var row = $('<tr>' +
                    '<td data-name="label">' + note.data().label + '</td>' +
                    '<td data-name="note">' + note.data().note + '</td>' +
                    '<td class="actions">' + actions + '</td></tr>' +
                    '</tr');

                row.data('document', note.data());

                $(".table-wrapper table").append(row);
                $('[data-toggle="tooltip"]').tooltip();
            }
        }

        $('[data-toggle="tooltip"]').tooltip();
    }
} */

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

function disableArea($) {
    $('#save').attr("disabled", "disabled");
    $('.add-new').attr("disabled", "disabled");
    $('.master-note-title').addClass("disabled");

    $('.table-wrapper tbody tr').each(function() {
        $(this).find('.add, .edit, .delete').addClass('disabled');
    });
}

function enableArea($) {
    $('#save').removeAttr("disabled");
    $('.master-note-title').removeClass("disabled");
}

function showUrl(shortId) {
    var $ = jQuery;

    $('.table-wrapper-2').parent('.container').removeClass('d-none');

    $('#url').html(
        '<a href="' + window.location.href.replace(/index\.html/, '') + shortId + '" target="_blank"> Your link is: ' +
            (window.location.href.replace(/index\.html/, '') + shortId) +
        '</a>'
    );
}

async function addNoteToUser(noteShortId) {
    return new Promise(function(resolve) {
        if (firebase.auth().currentUser) {
            var db = firebase.firestore();

            db.collection("UserProfile").where("email", "==", firebase.auth().currentUser.email).get()
                .then(function(result) {
                    var notes = result.docs[0].data().notes;

                    if (notes.indexOf(noteShortId) === -1) {
                        notes.push(noteShortId);

                        db.collection("UserProfile").doc(result.docs[0].id).update({
                            notes: notes
                        })
                    }

                    resolve(true);
                })
                .catch(function() {
                    showError('Could not retreive last insert id');
                    resolve(false);
                });
        } else {
            resolve(true);
        }
    });
}

async function addShortId(noteId) {
    return new Promise(async function(resolve) {
        var currentId = await getOrCreateLastInsertId();

        if (currentId !== null) {
            var db = firebase.firestore();

            db.collection("MasterNotes").doc(noteId).update({shortId: parseInt(currentId)})
                .then(async function() {
                    await increaseLastInsertId();
                    await addNoteToUser(parseInt(currentId));
                    showUrl(currentId);
                    resolve();
                })
                .catch(function(error) {
                    showError(error);
                });
        } else {
            showError('Could not retreive last insert id');
        }
    });
}

async function increaseLastInsertId() {
    return new Promise(async function(resolve) {
        var currentId = await getOrCreateLastInsertId();

        if (currentId !== null) {
            var db = firebase.firestore();

            db.collection("Settings").doc("lastInsertId").set({value: parseInt(currentId) + 1})
                .then(function() {
                    resolve();
                })
                .catch(function(error) {
                    showError(error);
                });
        } else {
            showError('Could not retreive last insert id');
        }
    });
}

function saveNote() {
    var name = ($('.master-note-title-input').length === 1) ? $('.master-note-title-input').val() : $('.master-note-title').text();

    var now = new Date();
    var dateCreated = now.getUTCFullYear() + '-' + now.getUTCMonth() + '-' + now.getUTCDate() + ' ' + now.getUTCHours() + ':' + now.getUTCMinutes() + ':' + now.getUTCSeconds();

    notes = [];

    if ($('.table-wrapper table tbody tr').length > 0) {
        $('.table-wrapper table tbody tr').each(function() {
            var label = ($(this).find('td input[name="label"]').length === 1) ? $(this).find('td input[name="label"]').val() : $(this).find('td[data-name="label"]').text();
            var note = ($(this).find('td input[name="note"]').length === 1) ? $(this).find('td input[name="note"]').val() : $(this).find('td[data-name="note"]').text();

            notes.push({
                label: escapeHtml(label),
                note: escapeHtml(note),
            });
        });

        var document = {
            name: escapeHtml(name),
            dateCreated: dateCreated,
            totalVisits: 0,
            notes: notes,
            options: {
                op1: $('#option1').is(':checked'),
                op2: $('#option2').is(':checked')
            }
        };

        disableArea($);

        var db = firebase.firestore();

        db.collection("MasterNotes").add(document)
            .then(async function(result) {
                await addShortId(result.id);
            })
            .catch(function(error){
                showError(error);
            });
    }
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

jQuery(document).ready(function ($) {
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

    $('.nav').hide();
    $('.nav-login').hide();

    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            $('.nav').hide();
            $('.nav-login').show();
        } else {
            $('.nav').show();
            $('.nav-login').hide();
        }
    });

    $(document).on('click', '.master-note-title', function(event) {
        if (!$(this).hasClass('disabled')) {
            var value = $(this).text();
            var $input = $('<input type="text" value="' + value + '" class="master-note-title-input">');
            $input.on('blur', function() {
                $(this).parent('div').html('<h2 class="master-note-title">' + $(this).val() + '</h2>');
            });
            $input.focus();

            $(this).parent().append($input);
            $(this).remove();
        }
    });

    // Append table with add row form on add new button click
    $(".add-new").on('click', function () {
        var actions = '<a class="add" title="Add" data-toggle="tooltip"><i class="material-icons">&#xE03B;</i></a>' +
            '<a class="edit" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a>' +
            '<a class="delete" title="Delete" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>';

        $(this).attr("disabled", "disabled");
        var index = $(".table-wrapper table tbody tr:last-child").index();
        var row = '<tr>' +
            '<td><input type="text" class="form-control" name="label"></td>' +
            '<td><input type="text" class="form-control" name="note"></td>' +
            '<td class="actions">' + actions + '</td>' +
            '</tr>';
        $(".table-wrapper table").append(row);
        $(".table-wrapper table tbody tr").eq(index + 1).find(".add, .delete").show();
        $(".table-wrapper table tbody tr").eq(index + 1).find(".edit").hide();
        $('[data-toggle="tooltip"]').tooltip();
    });

    $(document).on('click', '.add', function() {
        if ($(this).hasClass('disabled')) {
            return false;
        }

        var empty = false;
        var input = $(this).parents("tr").find('input[type="text"]');
        input.each(function(){
            if(!$(this).val()){
                $(this).addClass("error");
                empty = true;
            } else{
                $(this).removeClass("error");
            }
        });
        $(this).parents("tr").find(".error").first().focus();
        if (!empty) {
            $(this).parents("tr").find("td:not(:last-child)").each(function () {
                $(this).attr('data-name', $(this).find('input').attr('name'))
                $(this).html($(this).find('input').val());
            });

            $(this).closest('tr').find(".edit, .delete").show();
            $(this).closest('tr').find(".add").hide();

            if (!hasEmptyRows()) {
                $(".add-new").removeAttr("disabled");
            }
        }
    });

    $(document).on('click', '.edit', function() {
        if ($(this).hasClass('disabled')) {
            return false;
        }

        var inputs = $(this).closest('tr').find("td:not(:last-child)").each(function() {
            $(this).html('<input type="text" class="form-control" name="' + $(this).attr('data-name') + '" value="' + $(this).text() + '">');
        });

        $(this).closest('tr').find(".add, .delete").show();
        $(this).closest('tr').find(".edit").hide();

        $(".add-new").attr("disabled", "disabled");
    });

    $(document).on("click", ".delete", function () {
        if ($(this).hasClass('disabled')) {
            return false;
        }

        $(this).parents("tr").remove();
        $(".add-new").removeAttr("disabled");
    });

    $('#save').click(function() {
        if (!hasEmptyRows(true)) {
            saveNote();
        }
    });

    $('#create').on('click', function() {
        $('.table-wrapper-2').parent('.container').addClass('d-none');
        $('.table-wrapper tbody').html('');
        enableArea($);
        $('.add-new').click();
    });
});

function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider).then(function (result) {
        createUserIfNotExist();
        $('.nav').toggle();
    })
        .catch(function (error) {
            $('.table-wrapper').addClass('d-none');
            $('.error').removeClass('d-none');
            $('.error').html('<p class="alert alert-danger">' + error.message + '</p>');
            console.error(error);
        });
}

function facebookLogin() {
    var provider = new firebase.auth.FacebookAuthProvider();

    firebase.auth().signInWithPopup(provider).then(function (result) {
        createUserIfNotExist();
        $('.nav').toggle();
    }).catch(function (error) {
        $('.table-wrapper').addClass('d-none');
        $('.error').removeClass('d-none');
        $('.error').html('<p class="alert alert-danger">' + error.message + '</p>');
        console.error(error);
    });
}

function logout() {
    firebase.auth().signOut().then(function () {
        $('.nav').show();
        $('.nav-login').hide();
    }, function (error) {
        $('.table-wrapper').addClass('d-none');
        $('.error').removeClass('d-none');
        $('.error').html('<p class="alert alert-danger">Could not signed out</p>');
        console.error(error);
    });
}

function createUserIfNotExist() {
    var db = firebase.firestore();

    const email = firebase.auth().currentUser.email
    const userProfileCollection = db.collection("UserProfile");
    userProfileCollection.where("email", "==", email).get()
        .then(function (result) {
            if (result.docs.length === 0) {
                userProfileCollection.add({
                    email: email,
                    notes: []
                });
            }
        })
        .catch(function (error) {
            $('.table-wrapper').addClass('d-none');
            $('.error').removeClass('d-none');
            $('.error').html('<p class="alert alert-danger">Could not get the user</p>');
            console.error(error);
        });
}