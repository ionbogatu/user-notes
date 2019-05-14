function getShortId() {
    var hrefParts = window.location.href.split("/");

    return hrefParts[hrefParts.length - 1];
}

function reloadNotes() {
    return new Promise(function(resolve) {
        var noteShortId = getShortId();

        var db = window.fb.firestore;

        db.collection("MasterNotes").where("shortId", "==", noteShortId).get()
            .then(async function (result) {
                if (result.docs.length > 0 && result.docs[0].id) {
                    var data = result.docs[0].data();

                    if (data.status === "delete") {
                        showMessage(window.i18n['en']['the-record-was-deleted'], 'alert-danger');
                    } else {
                        $('.master-note-title span').text(data.name);

                        $notes = $('.table-bordered tbody');
                        $notes.html('');

                        var actions = '<a class="add" title="' + window.i18n['en']['add'] + '" data-toggle="tooltip"><i class="material-icons">&#xE03B;</i></a>' +
                            '<a class="edit" title="' + window.i18n['en']['edit'] + '" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a>' +
                            '<a class="delete" title="' + window.i18n['en']['delete'] + '" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>';

                        for (var note of data.notes) {
                            $notes.append('<tr>' +
                                '<td data-name="label">' + note.label + '</td>' +
                                '<td data-name="note">' + note.note + '</td>' +
                                '<td class="logged-in d-none">' + actions + '</td>' +
                                '</tr>');
                        }

                        /*if (data.options.op1) {
                            $('#option1').attr('checked', 'checked');
                        }

                        if (data.options.op2) {
                            $('#option2').attr('checked', 'checked');
                        }*/

                        var hasAccess = false;

                        if (localStorage.getItem('user_id')) {
                            var user = await window.fb.firestore.collection('UserProfile').doc(localStorage.getItem('user_id')).get();

                            if (user) {
                                hasAccess = user.data().notes.indexOf(noteShortId) > -1;
                            }
                        }

                        if (
                            window.fb.auth.currentUser &&
                            hasAccess
                        ) {
                            $('#update').removeClass('d-none');
                            $('#option1').removeAttr("disabled");
                            $('#option2').removeAttr("disabled");
                            $('#option1').closest('.form-check').removeClass('d-none');
                            $('#option2').closest('.form-check').removeClass('d-none');
                            $('.logged-in').each(function() {
                                $(this).removeClass('d-none');
                            });
                        } else {
                            $('#update').addClass('d-none');
                            $('#option1').attr("disabled", "disabled");
                            $('#option2').attr("disabled", "disabled");
                            $('#option1').closest('.form-check').addClass('d-none');
                            $('#option2').closest('.form-check').addClass('d-none');
                            $('.logged-in').each(function() {
                                $(this).addClass('d-none');
                            });
                        }
                    }

                    resolve(true);
                } else {
                    showMessage(window.i18n['en']['record-does-not-exist'], 'alert-danger');
                    resolve(false);
                }
            })
            .catch(function (error) {
                console.log(error);
                resolve(false);
            });
    });    
}

function getLocationOrIP() {
    return new Promise(function (resolve) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            }, function(error) {
                $.getJSON("https://httpbin.org/ip", function(data){
                    if (data && data.origin) {
                        var ips = data.origin.split(', ');

                        if (ips && ips[0]) {
                            resolve(ips[0]);
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });
        } else {
            $.getJSON("https://httpbin.org/ip", function(data){
                if (data && data.origin) {
                    var ips = data.origin.split(', ');

                    if (ips && ips[0]) {
                        resolve(ips[0]);
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        }
    });
} 

async function updateStats() {
    return new Promise(function(resolve) {
        var db = window.fb.firestore;

        var masterNotesCollection = db.collection("MasterNotes");
        var masterStatsCollection = db.collection("MasterStats");

        var shortId = getShortId();

        masterNotesCollection.where("shortId", "==", shortId).get()
            .then(function (result) {
                if (result.docs.length > 0 && result.docs[0].id) {
                    masterNotesCollection.doc(result.docs[0].id).update({
                        totalVisits: result.docs[0].data().totalVisits + 1
                    }).catch(function (error) {
                        showMessage(window.i18n['en']['could-not-update-total-visits'], 'alert-danger')
                    });

                    const now = new Date();
                    var dateCreated = now.getUTCFullYear() + '-' + now.getUTCMonth() + '-' + now.getUTCDate() + ' ' + now.getUTCHours() + ':' + now.getUTCMinutes() + ':' + now.getUTCSeconds();

                    getLocationOrIP().then(async function(result) {
                        if (typeof result === "string") { // ip
                            await masterStatsCollection.add({
                                shortId: shortId,
                                date: dateCreated,
                                ip: result,
                                geo: null
                            });
                        } else { // coords or null
                            await masterStatsCollection.add({
                                shortId: shortId,
                                date: dateCreated,
                                ip: null,
                                geo: result
                            });
                        }

                        resolve(true);
                    });
                } else {
                    showMessage(window.i18n['en']['could-not-get-the-note'], 'alert-danger');
                    resolve(true);
                }
            })
            .catch(function (error) {
                console.log(error);
                showMessage(window.i18n['en']['could-not-get-the-note'], 'alert-danger');
                resolve(false);
            });
    })
} 

function updateNote() {
    if (hasEmptyRows(true)) {
        return;
    }

    var name = ($('.master-note-title-input').length === 1) ? $('.master-note-title-input').val() : $('.master-note-title span').text();

    $('.master-note-title-input').blur();

    showLoader();

    notes = [];

    $('.message').html('');

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
            notes: notes,
            options: {
                op1: $('#option1').is(':checked'),
                op2: $('#option2').is(':checked')
            }
        };

        var db = window.fb.firestore;

        var shortId = getShortId();

        db.collection("MasterNotes").where("shortId", "==", shortId).get()
            .then(function(result) {
                if (result.docs.length === 1) {
                    db.collection("MasterNotes").doc(result.docs[0].id).update(document)
                        .then(function(result) {
                            showMessage(window.i18n['en']['note-saved'], 'alert-success');
                        })
                } else {
                    showMessage(window.i18n['en']['could-not-find-the-note-to-update'], 'alert-danger');
                }

                hideLoader();
            })
            .catch(function(error){
                console.log(error);
                hideLoader();
                showMessage(error, 'alert-danger');
            });
    }
}

async function init() {
    var $ = jQuery;

    showLoader();

    await updateStats();

    // await reloadNotes();

    hideLoader();
}

jQuery(document).ready(function ($) {

    init();

    window.fb.auth.onAuthStateChanged(async function (user) {
        if (user) {
            await window.fb.firestore.collection("UserProfile").where('email', '==', window.fb.auth.currentUser.email).get()
                .then(function(result) {
                    if (result.docs.length === 1) {
                        localStorage.setItem('user_id', result.docs[0].id);
                    }
                }).catch(function(error) {
                    console.log(error);
                });

            $('.nav').hide();
            $('.nav-login').show();
            // $('.master-note-title .edit, .add-new').removeClass('d-none');
            // $('#option1').closest('.form-check').removeClass('d-none');
            // $('#option2').closest('.form-check').removeClass('d-none');

            hideMessage();
        } else {
            localStorage.removeItem('user_id');
            $('.nav').show();
            $('.nav-login').hide();
            // $('.master-note-title .edit, .add-new').addClass('d-none');
            // $('#option1').closest('.form-check').addClass('d-none');
            // $('#option2').closest('.form-check').addClass('d-none');
        }

        showLoader();

        await reloadNotes();

        hideLoader();
    });

    $(document).on('click', '.master-note-title', function(event) {
        if (window.fb.auth.currentUser) {
            var value = $(this).find('span').text();
            var $input = $('<input type="text" value="' + value + '" class="master-note-title-input">');
            $input.on('blur', function() {
                $(this).parent('div').html('<h2 class="master-note-title d-flex"><span>' + $(this).val() + '</span><a class="edit ml-2" title="' + window.i18n['en']['edit'] + '" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a></h2>');
            });
            $input.focus();

            $(this).parent().append($input);
            $(this).remove();
        }
    });

    $(".add-new").on('click', function () {
        var actions = '<a class="add" title="' + window.i18n['en']['add'] + '" data-toggle="tooltip"><i class="material-icons">&#xE03B;</i></a>' +
            '<a class="edit" title="' + window.i18n['en']['edit'] + '" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a>' +
            '<a class="delete" title="' + window.i18n['en']['delete'] + '" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>';

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
        var inputs = $(this).closest('tr').find("td:not(:last-child)").each(function() {
            $(this).html('<input type="text" class="form-control" name="' + $(this).attr('data-name') + '" value="' + $(this).text() + '">');
        });

        $(this).closest('tr').find(".add, .delete").show();
        $(this).closest('tr').find(".edit").hide();

        $(".add-new").attr("disabled", "disabled");
    });

    $(document).on("click", ".delete", function () {
        $(this).parents("tr").remove();
        $(".add-new").removeAttr("disabled");

        if ($('.table-wrapper tbody tr').length === 0) {
            $('.add-new').click();
        }
    });

    $('#update').on('click', function() {
        if (!hasEmptyRows(true)) {
            updateNote();
        }
    });
});