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
                showMessage(error, 'alert-danger');
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

function disableArea($) {
    $('#save').attr("disabled", "disabled");
    $('.add-new').attr("disabled", "disabled");
    $('.master-note-title').addClass("disabled");

    $('.table-wrapper tbody tr').each(function() {
        $(this).find("input").each(function () {
            $(this).parent('td').html($(this).val());
        });

        $(this).find('.add, .edit, .delete').addClass('disabled');
    });

    $('#option1').attr("disabled", "disabled");
    $('#option2').attr("disabled", "disabled");

    $('.table-wrapper').addClass('blurred');
}

function enableArea($) {
    $('#save').removeAttr("disabled");
    $('.master-note-title').removeClass("disabled");

    $('#option1').removeAttr("disabled");
    $('#option2').removeAttr("disabled");

    $('.table-wrapper').removeClass('blurred');
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
                    showMessage('Could not retreive last insert id', 'alert-danger');
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
                    showMessage(error, 'alert-danger');
                });
        } else {
            showMessage('Could not retreive last insert id', 'alert-danger');
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
                    showMessage(error, 'alert-danger');
                });
        } else {
            showMessage('Could not retreive last insert id', 'alert-danger');
        }
    });
}

function saveNote() {
    var name = ($('.master-note-title-input').length === 1) ? $('.master-note-title-input').val() : $('.master-note-title span').text();

    showLoader();

    $('.master-note-title-input').blur();

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

        var db = firebase.firestore();

        db.collection("MasterNotes").add(document)
            .then(async function(result) {
                await addShortId(result.id);
                hideLoader();
                disableArea($);
            })
            .catch(function(error){
                hideLoader();
                showMessage(error, 'alert-danger');
            });
    }
}

jQuery(document).ready(function ($) {
    $('.nav').hide();
    $('.nav-login').hide();

    if (isUserLoggedIn()) {
        $('.nav').hide();
        $('.nav-login').show();
    } else {
        $('.nav').show();
        $('.nav-login').hide();
    }

    $(document).on('click', '.master-note-title', function(event) {
        if (!$(this).hasClass('disabled')) {
            var value = $(this).find('span').text();
            var $input = $('<input type="text" value="' + value + '" class="master-note-title-input">');
            $input.on('blur', function() {
                $(this).parent('div').html('<h2 class="master-note-title d-flex"><span>' + $(this).val() + '</span><a class="edit ml-2" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a></h2>');
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

    $('.add-new').click();

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

        if ($('.table-wrapper tbody tr').length === 0) {
            $('.add-new').click();
        }
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

