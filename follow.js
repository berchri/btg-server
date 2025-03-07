const obj = {
    name: 'A',
    path: [0],
    children: [
        {
            name: 'B',
            path: [0, 0],
            children: [
                {
                    name: 'C',
                    path: [0, 0, 0]
                },
                {
                    name: 'D',
                    path: [0, 0, 1]
                }
            ]
        },
        {
            name: 'E',
            path: [0, 1]
        }
    ]
};

function select( obj, path ) {
    return path.reduce( ( prev, currentIndex ) => prev.children[currentIndex], { children: [obj] } )
}

console.log( select( obj, [0, 0, 1] ) )